import type {
  ImageWorkerFailure,
  ImageWorkerInput,
  ImageWorkerResponse,
  ImageWorkerSuccess,
} from "./image-worker-protocol";

const DEFAULT_MAX_PIXELS = 16_777_216;
const DEFAULT_MAX_INPUT_BYTES = 25_000_000;

function runtimeInfo(): ImageWorkerSuccess["runtime"] {
  return {
    architecture: process.arch,
    bunRevision: Bun.revision,
    bunVersion: Bun.version,
    hasBunImage: typeof Bun.Image,
    platform: process.platform,
  };
}

function writeResponse(response: ImageWorkerResponse): never {
  process.stdout.write(JSON.stringify(response));
  process.exit(response.success ? 0 : 1);
}

function writeFailure(error: string, code?: string): never {
  const response: ImageWorkerFailure = {
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

function parseProbeImageInput(
  record: Record<string, unknown>,
  sourceRecord: Record<string, unknown>
): Extract<ImageWorkerInput, { mode: "probe-image" }> {
  const shared = {
    maxInputBytes:
      typeof record.maxInputBytes === "number"
        ? record.maxInputBytes
        : DEFAULT_MAX_INPUT_BYTES,
    maxPixels:
      typeof record.maxPixels === "number"
        ? record.maxPixels
        : DEFAULT_MAX_PIXELS,
    mode: "probe-image" as const,
  };

  if (sourceRecord.type === "url") {
    if (typeof sourceRecord.url !== "string" || sourceRecord.url.length === 0) {
      writeFailure("URL source requires a non-empty url.", "INVALID_SOURCE");
    }

    return {
      ...shared,
      source: {
        type: "url",
        url: sourceRecord.url,
      },
    };
  }

  if (sourceRecord.type === "path") {
    if (
      typeof sourceRecord.path !== "string" ||
      sourceRecord.path.length === 0
    ) {
      writeFailure("Path source requires a non-empty path.", "INVALID_SOURCE");
    }

    return {
      ...shared,
      source: {
        path: sourceRecord.path,
        type: "path",
      },
    };
  }

  writeFailure("source.type must be url or path.", "INVALID_SOURCE");
}

function parseInput(raw: string): ImageWorkerInput {
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

    if (mode !== "probe-image") {
      writeFailure(`Unsupported mode: ${String(mode)}`, "INVALID_MODE");
    }

    const { source } = record;
    if (source === null || typeof source !== "object") {
      writeFailure("probe-image requires a source object.", "INVALID_SOURCE");
    }

    return parseProbeImageInput(record, source as Record<string, unknown>);
  } catch {
    writeFailure("Worker input must be valid JSON.", "INVALID_JSON");
  }
}

async function loadSourceBytes(
  input: Extract<ImageWorkerInput, { mode: "probe-image" }>
): Promise<Uint8Array> {
  const maxInputBytes = input.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;

  if (input.source.type === "path") {
    const file = Bun.file(input.source.path);
    const exists = await file.exists();

    if (!exists) {
      writeFailure(`File not found: ${input.source.path}`, "SOURCE_NOT_FOUND");
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

  const response = await fetch(input.source.url);
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

async function probeImage(
  input: Extract<ImageWorkerInput, { mode: "probe-image" }>
): Promise<ImageWorkerSuccess> {
  if (typeof Bun.Image !== "function") {
    writeFailure("Bun.Image is not available in this runtime.", "NO_BUN_IMAGE");
  }

  const bytes = await loadSourceBytes(input);
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

async function main(): Promise<void> {
  const rawInput = await readStdin();
  const input = parseInput(rawInput);

  if (input.mode === "probe-image") {
    writeResponse(await probeImage(input));
    return;
  }

  const response: ImageWorkerSuccess = {
    runtime: runtimeInfo(),
    success: true,
  };
  writeResponse(response);
}

main().catch((cause) => {
  const message = cause instanceof Error ? cause.message : "Worker failed.";
  writeFailure(message, "WORKER_UNHANDLED_ERROR");
});
