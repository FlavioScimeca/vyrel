import type {
  PortingImageOperation,
  PortingPipelineTerminal,
  PortingWorkerFailure,
  PortingWorkerInput,
  PortingWorkerResponse,
  PortingWorkerSource,
  PortingWorkerSuccess,
} from "../internal/protocol";

const DEFAULT_MAX_PIXELS = 16_777_216;
const DEFAULT_MAX_INPUT_BYTES = 25_000_000;

function runtimeInfo(): PortingWorkerSuccess["runtime"] {
  return {
    architecture: process.arch,
    bunRevision: Bun.revision,
    bunVersion: Bun.version,
    hasBunImage: typeof Bun.Image,
    platform: process.platform,
  };
}

function writeResponse(response: PortingWorkerResponse): never {
  process.stdout.write(JSON.stringify(response));
  process.exit(response.success ? 0 : 1);
}

function writeFailure(error: string, code?: string): never {
  const response: PortingWorkerFailure = {
    code,
    error,
    success: false,
  };
  writeResponse(response);
}

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8").trim();
}

function parseSource(
  source: unknown,
  allowBytesBase64: boolean
): PortingWorkerSource {
  if (source === null || typeof source !== "object") {
    writeFailure("source must be an object.", "INVALID_SOURCE");
  }

  const sourceRecord = source as Record<string, unknown>;
  const sourceType = sourceRecord.type;

  if (sourceType === "url") {
    if (typeof sourceRecord.url !== "string" || sourceRecord.url.length === 0) {
      writeFailure("URL source requires a non-empty url.", "INVALID_SOURCE");
    }
    return { type: "url", url: sourceRecord.url };
  }

  if (sourceType === "path") {
    if (
      typeof sourceRecord.path !== "string" ||
      sourceRecord.path.length === 0
    ) {
      writeFailure("Path source requires a non-empty path.", "INVALID_SOURCE");
    }
    return { path: sourceRecord.path, type: "path" };
  }

  if (sourceType === "bytes-base64") {
    if (!allowBytesBase64) {
      writeFailure(
        "bytes-base64 source is not allowed for this mode.",
        "INVALID_SOURCE"
      );
    }
    if (
      typeof sourceRecord.data !== "string" ||
      sourceRecord.data.length === 0
    ) {
      writeFailure(
        "bytes-base64 source requires non-empty data.",
        "INVALID_SOURCE"
      );
    }
    return { data: sourceRecord.data, type: "bytes-base64" };
  }

  writeFailure(
    "source.type must be url, path, or bytes-base64.",
    "INVALID_SOURCE"
  );
}

function parseInput(raw: string): PortingWorkerInput {
  if (raw.length === 0) {
    return { mode: "diagnostic" };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      writeFailure("Worker input must be a JSON object.", "INVALID_INPUT");
    }

    const record = parsed as Record<string, unknown>;
    const mode = record.mode ?? "diagnostic";

    if (mode === "diagnostic") {
      return { mode: "diagnostic" };
    }

    const maxInputBytes =
      typeof record.maxInputBytes === "number"
        ? record.maxInputBytes
        : DEFAULT_MAX_INPUT_BYTES;
    const maxPixels =
      typeof record.maxPixels === "number"
        ? record.maxPixels
        : DEFAULT_MAX_PIXELS;

    if (mode === "probe-image") {
      const source = parseSource(record.source, false);
      if (source.type === "bytes-base64") {
        writeFailure(
          "probe-image does not support bytes-base64.",
          "INVALID_SOURCE"
        );
      }
      return {
        maxInputBytes,
        maxPixels,
        mode: "probe-image",
        source,
      };
    }

    if (mode === "execute-pipeline") {
      if (!Array.isArray(record.operations)) {
        writeFailure(
          "execute-pipeline requires an operations array.",
          "INVALID_OPERATIONS"
        );
      }

      const { terminal } = record;
      if (
        terminal !== "metadata" &&
        terminal !== "bytes" &&
        terminal !== "buffer" &&
        terminal !== "blob" &&
        terminal !== "dataurl"
      ) {
        writeFailure(
          "execute-pipeline requires a valid terminal.",
          "INVALID_TERMINAL"
        );
      }

      return {
        maxInputBytes,
        maxPixels,
        mode: "execute-pipeline",
        operations: record.operations as PortingImageOperation[],
        source: parseSource(record.source, true),
        terminal,
      };
    }

    writeFailure(`Unsupported mode: ${String(mode)}`, "INVALID_MODE");
  } catch {
    writeFailure("Worker input must be valid JSON.", "INVALID_JSON");
  }
}

async function loadSourceBytes(
  source: PortingWorkerSource,
  maxInputBytes: number
): Promise<Uint8Array> {
  if (source.type === "bytes-base64") {
    const bytes = Buffer.from(source.data, "base64");
    if (bytes.byteLength > maxInputBytes) {
      writeFailure(
        `Image exceeds maxInputBytes (${maxInputBytes}).`,
        "INPUT_TOO_LARGE"
      );
    }
    return bytes;
  }

  if (source.type === "path") {
    const file = Bun.file(source.path);
    const exists = await file.exists();

    if (!exists) {
      writeFailure(`File not found: ${source.path}`, "SOURCE_NOT_FOUND");
    }

    const { size } = file;
    if (size > maxInputBytes) {
      writeFailure(
        `Image exceeds maxInputBytes (${maxInputBytes}).`,
        "INPUT_TOO_LARGE"
      );
    }

    return file.bytes();
  }

  const response = await fetch(source.url);
  if (!response.ok) {
    writeFailure(
      `Failed to download image (${response.status} ${response.statusText}).`,
      "SOURCE_DOWNLOAD_FAILED"
    );
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxInputBytes) {
      writeFailure(
        `Image exceeds maxInputBytes (${maxInputBytes}).`,
        "INPUT_TOO_LARGE"
      );
    }
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxInputBytes) {
    writeFailure(
      `Image exceeds maxInputBytes (${maxInputBytes}).`,
      "INPUT_TOO_LARGE"
    );
  }

  return bytes;
}

function applyOperations(
  image: InstanceType<typeof Bun.Image>,
  operations: PortingImageOperation[]
): InstanceType<typeof Bun.Image> {
  let current = image;

  for (const operation of operations) {
    if (operation.op === "resize") {
      current = current.resize(
        operation.width,
        operation.height,
        operation.options
      );
      continue;
    }

    if (operation.op === "webp") {
      current = current.webp(operation.options);
      continue;
    }

    if (operation.op === "jpeg") {
      current = current.jpeg(operation.options);
      continue;
    }

    if (operation.op === "png") {
      current = current.png(operation.options);
      continue;
    }

    writeFailure(
      `Unsupported operation: ${(operation as { op: string }).op}`,
      "UNSUPPORTED_OPERATION"
    );
  }

  return current;
}

async function runTerminal(
  image: InstanceType<typeof Bun.Image>,
  terminal: PortingPipelineTerminal
): Promise<PortingWorkerSuccess["pipeline"]> {
  if (terminal === "metadata") {
    const metadata = await image.metadata();
    return {
      metadata: {
        format: metadata.format,
        height: metadata.height,
        width: metadata.width,
      },
    };
  }

  if (terminal === "dataurl") {
    const dataUrl = await image.dataurl();
    return { dataUrl };
  }

  const bytes = await image.bytes();
  return {
    byteLength: bytes.byteLength,
    bytesBase64: Buffer.from(bytes).toString("base64"),
  };
}

async function probeImage(
  input: Extract<PortingWorkerInput, { mode: "probe-image" }>
): Promise<PortingWorkerSuccess> {
  if (typeof Bun.Image !== "function") {
    writeFailure("Bun.Image is not available in this runtime.", "NO_BUN_IMAGE");
  }

  const bytes = await loadSourceBytes(
    input.source,
    input.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES
  );
  const maxPixels = input.maxPixels ?? DEFAULT_MAX_PIXELS;

  let metadata: { width: number; height: number };
  try {
    metadata = await new Bun.Image(bytes, { maxPixels }).metadata();
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to decode image.";
    writeFailure(message, "IMAGE_DECODE_FAILED");
  }

  const { width, height } = metadata;

  if (
    !(Number.isFinite(width) && Number.isFinite(height)) ||
    width <= 0 ||
    height <= 0
  ) {
    writeFailure(
      "Image dimensions are unavailable.",
      "IMAGE_DIMENSIONS_UNAVAILABLE"
    );
  }

  return {
    image: {
      byteLength: bytes.byteLength,
      height,
      width,
    },
    runtime: runtimeInfo(),
    success: true,
  };
}

async function executePipeline(
  input: Extract<PortingWorkerInput, { mode: "execute-pipeline" }>
): Promise<PortingWorkerSuccess> {
  if (typeof Bun.Image !== "function") {
    writeFailure("Bun.Image is not available in this runtime.", "NO_BUN_IMAGE");
  }

  const bytes = await loadSourceBytes(
    input.source,
    input.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES
  );
  const maxPixels = input.maxPixels ?? DEFAULT_MAX_PIXELS;

  let image: InstanceType<typeof Bun.Image>;
  try {
    image = new Bun.Image(bytes, { maxPixels });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to decode image.";
    writeFailure(message, "IMAGE_DECODE_FAILED");
  }

  image = applyOperations(image, input.operations);

  let pipeline: PortingWorkerSuccess["pipeline"];
  try {
    pipeline = await runTerminal(image, input.terminal);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Pipeline terminal failed.";
    writeFailure(message, "PIPELINE_TERMINAL_FAILED");
  }

  return {
    pipeline,
    runtime: runtimeInfo(),
    success: true,
  };
}

async function main(): Promise<void> {
  const rawInput = await readStdin();
  const input = parseInput(rawInput);

  if (input.mode === "probe-image") {
    writeResponse(await probeImage(input));
    return;
  }

  if (input.mode === "execute-pipeline") {
    writeResponse(await executePipeline(input));
    return;
  }

  const response: PortingWorkerSuccess = {
    runtime: runtimeInfo(),
    success: true,
  };
  writeResponse(response);
}

main().catch((cause) => {
  const message = cause instanceof Error ? cause.message : "Worker failed.";
  writeFailure(message, "WORKER_UNHANDLED_ERROR");
});
