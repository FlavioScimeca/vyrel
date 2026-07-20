import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
} from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Chunk, Effect, Layer, Schema, Stream } from "effect";

import { BunPortingError } from "../internal/errors";
import type {
  PortingImageOperation,
  PortingPipelineSpec,
  PortingPipelineTerminal,
  PortingWorkerFailure,
  PortingWorkerInput,
  PortingWorkerPipelineResult,
  PortingWorkerResponse,
  PortingWorkerSource,
  PortingWorkerSuccess,
} from "../internal/protocol";

const DEFAULT_MAX_PIXELS = 16_777_216;
const DEFAULT_MAX_INPUT_BYTES = 25_000_000;

const WorkerLayer = Layer.merge(BunContext.layer, FetchHttpClient.layer);
const decodeJson = Schema.decodeUnknown(Schema.parseJson(Schema.Unknown));

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

const failWorker = (message: string, code?: string) =>
  new BunPortingError({ code, message });

const readStdin = Stream.fromAsyncIterable(
  Bun.stdin.stream(),
  (cause) =>
    new BunPortingError({
      cause,
      message: "Failed to read stdin.",
    })
).pipe(
  Stream.runCollect,
  Effect.map((chunks) =>
    Buffer.concat(Chunk.toReadonlyArray(chunks)).toString("utf8").trim()
  )
);

const parseSource = (
  source: unknown,
  allowBytesBase64: boolean
): Effect.Effect<PortingWorkerSource, BunPortingError> => {
  if (source === null || typeof source !== "object") {
    return failWorker("source must be an object.", "INVALID_SOURCE");
  }

  const sourceRecord = source as Record<string, unknown>;
  const sourceType = sourceRecord.type;

  if (sourceType === "url") {
    if (typeof sourceRecord.url !== "string" || sourceRecord.url.length === 0) {
      return failWorker(
        "URL source requires a non-empty url.",
        "INVALID_SOURCE"
      );
    }
    return Effect.succeed({ type: "url", url: sourceRecord.url });
  }

  if (sourceType === "path") {
    if (
      typeof sourceRecord.path !== "string" ||
      sourceRecord.path.length === 0
    ) {
      return failWorker(
        "Path source requires a non-empty path.",
        "INVALID_SOURCE"
      );
    }
    return Effect.succeed({ path: sourceRecord.path, type: "path" });
  }

  if (sourceType === "bytes-base64") {
    if (!allowBytesBase64) {
      return failWorker(
        "bytes-base64 source is not allowed for this mode.",
        "INVALID_SOURCE"
      );
    }
    if (
      typeof sourceRecord.data !== "string" ||
      sourceRecord.data.length === 0
    ) {
      return failWorker(
        "bytes-base64 source requires non-empty data.",
        "INVALID_SOURCE"
      );
    }
    return Effect.succeed({ data: sourceRecord.data, type: "bytes-base64" });
  }

  return failWorker(
    "source.type must be url, path, or bytes-base64.",
    "INVALID_SOURCE"
  );
};

const limitsFromRecord = (
  record: Record<string, unknown>
): { maxInputBytes: number; maxPixels: number } => ({
  maxInputBytes:
    typeof record.maxInputBytes === "number"
      ? record.maxInputBytes
      : DEFAULT_MAX_INPUT_BYTES,
  maxPixels:
    typeof record.maxPixels === "number"
      ? record.maxPixels
      : DEFAULT_MAX_PIXELS,
});

const parseProbeImageInput = (
  record: Record<string, unknown>
): Effect.Effect<
  Extract<PortingWorkerInput, { mode: "probe-image" }>,
  BunPortingError
> =>
  Effect.gen(function* () {
    const source = yield* parseSource(record.source, false);
    if (source.type === "bytes-base64") {
      return yield* failWorker(
        "probe-image does not support bytes-base64.",
        "INVALID_SOURCE"
      );
    }
    const limits = limitsFromRecord(record);
    return {
      ...limits,
      mode: "probe-image" as const,
      source,
    };
  });

const isPipelineTerminal = (
  terminal: unknown
): terminal is PortingPipelineTerminal =>
  terminal === "metadata" ||
  terminal === "bytes" ||
  terminal === "buffer" ||
  terminal === "blob" ||
  terminal === "dataurl";

const parseExecutePipelineInput = (
  record: Record<string, unknown>
): Effect.Effect<
  Extract<PortingWorkerInput, { mode: "execute-pipeline" }>,
  BunPortingError
> =>
  Effect.gen(function* () {
    if (!Array.isArray(record.operations)) {
      return yield* failWorker(
        "execute-pipeline requires an operations array.",
        "INVALID_OPERATIONS"
      );
    }

    const { terminal } = record;
    if (!isPipelineTerminal(terminal)) {
      return yield* failWorker(
        "execute-pipeline requires a valid terminal.",
        "INVALID_TERMINAL"
      );
    }

    const limits = limitsFromRecord(record);
    return {
      ...limits,
      mode: "execute-pipeline" as const,
      operations: record.operations as PortingImageOperation[],
      source: yield* parseSource(record.source, true),
      terminal,
    };
  });

const parsePipelineSpec = (
  key: string,
  value: unknown
): Effect.Effect<PortingPipelineSpec, BunPortingError> => {
  if (value === null || typeof value !== "object") {
    return failWorker(
      `pipelines.${key} must be an object.`,
      "INVALID_OPERATIONS"
    );
  }

  const spec = value as Record<string, unknown>;
  if (!Array.isArray(spec.operations)) {
    return failWorker(
      `pipelines.${key} requires an operations array.`,
      "INVALID_OPERATIONS"
    );
  }

  if (!isPipelineTerminal(spec.terminal)) {
    return failWorker(
      `pipelines.${key} requires a valid terminal.`,
      "INVALID_TERMINAL"
    );
  }

  return Effect.succeed({
    operations: spec.operations as PortingImageOperation[],
    terminal: spec.terminal,
  });
};

const parseExecutePipelinesInput = (
  record: Record<string, unknown>
): Effect.Effect<
  Extract<PortingWorkerInput, { mode: "execute-pipelines" }>,
  BunPortingError
> =>
  Effect.gen(function* () {
    if (
      record.pipelines === null ||
      typeof record.pipelines !== "object" ||
      Array.isArray(record.pipelines)
    ) {
      return yield* failWorker(
        "execute-pipelines requires a pipelines object.",
        "INVALID_OPERATIONS"
      );
    }

    const pipelineRecord = record.pipelines as Record<string, unknown>;
    const keys = Object.keys(pipelineRecord);
    if (keys.length === 0) {
      return yield* failWorker(
        "execute-pipelines requires at least one pipeline.",
        "INVALID_OPERATIONS"
      );
    }

    const pipelines: Record<string, PortingPipelineSpec> = {};
    for (const key of keys) {
      pipelines[key] = yield* parsePipelineSpec(key, pipelineRecord[key]);
    }

    const limits = limitsFromRecord(record);
    return {
      ...limits,
      mode: "execute-pipelines" as const,
      pipelines,
      source: yield* parseSource(record.source, true),
    };
  });

const parseInput = (
  raw: string
): Effect.Effect<PortingWorkerInput, BunPortingError> =>
  Effect.gen(function* () {
    if (raw.length === 0) {
      return { mode: "diagnostic" as const };
    }

    const parsed = yield* decodeJson(raw).pipe(
      Effect.mapError(
        (cause) =>
          new BunPortingError({
            cause,
            code: "INVALID_JSON",
            message: "Worker input must be valid JSON.",
          })
      )
    );

    if (parsed === null || typeof parsed !== "object") {
      return yield* failWorker(
        "Worker input must be a JSON object.",
        "INVALID_INPUT"
      );
    }

    const record = parsed as Record<string, unknown>;
    const mode = record.mode ?? "diagnostic";

    if (mode === "diagnostic") {
      return { mode: "diagnostic" as const };
    }

    if (mode === "probe-image") {
      return yield* parseProbeImageInput(record);
    }

    if (mode === "execute-pipeline") {
      return yield* parseExecutePipelineInput(record);
    }

    if (mode === "execute-pipelines") {
      return yield* parseExecutePipelinesInput(record);
    }

    return yield* failWorker(
      `Unsupported mode: ${String(mode)}`,
      "INVALID_MODE"
    );
  });

const loadSourceBytes = (
  source: PortingWorkerSource,
  maxInputBytes: number
): Effect.Effect<Uint8Array, BunPortingError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    if (source.type === "bytes-base64") {
      const bytes = Buffer.from(source.data, "base64");
      if (bytes.byteLength > maxInputBytes) {
        return yield* failWorker(
          `Image exceeds maxInputBytes (${maxInputBytes}).`,
          "INPUT_TOO_LARGE"
        );
      }
      return bytes;
    }

    if (source.type === "path") {
      const file = Bun.file(source.path);
      const exists = yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: `Failed to check source path: ${source.path}`,
          }),
        try: () => file.exists(),
      });

      if (!exists) {
        return yield* failWorker(
          `File not found: ${source.path}`,
          "SOURCE_NOT_FOUND"
        );
      }

      const { size } = file;
      if (size > maxInputBytes) {
        return yield* failWorker(
          `Image exceeds maxInputBytes (${maxInputBytes}).`,
          "INPUT_TOO_LARGE"
        );
      }

      return yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: `Failed to read source path: ${source.path}`,
          }),
        try: () => file.bytes(),
      });
    }

    return yield* HttpClient.get(source.url).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) =>
        Effect.gen(function* () {
          const contentLengthHeader = response.headers["content-length"];
          if (contentLengthHeader !== undefined) {
            const contentLength = Number(contentLengthHeader);
            if (
              Number.isFinite(contentLength) &&
              contentLength > maxInputBytes
            ) {
              return yield* failWorker(
                `Image exceeds maxInputBytes (${maxInputBytes}).`,
                "INPUT_TOO_LARGE"
              );
            }
          }

          const buffer = yield* response.arrayBuffer;
          const bytes = new Uint8Array(buffer);
          if (bytes.byteLength > maxInputBytes) {
            return yield* failWorker(
              `Image exceeds maxInputBytes (${maxInputBytes}).`,
              "INPUT_TOO_LARGE"
            );
          }

          return bytes;
        })
      ),
      Effect.scoped,
      Effect.mapError((cause) =>
        cause instanceof BunPortingError
          ? cause
          : new BunPortingError({
              cause,
              code: "SOURCE_DOWNLOAD_FAILED",
              message: "Failed to download image.",
            })
      )
    );
  });

const applyOperations = (
  image: InstanceType<typeof Bun.Image>,
  operations: PortingImageOperation[]
): Effect.Effect<InstanceType<typeof Bun.Image>, BunPortingError> =>
  Effect.gen(function* () {
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

      return yield* failWorker(
        `Unsupported operation: ${(operation as { op: string }).op}`,
        "UNSUPPORTED_OPERATION"
      );
    }

    return current;
  });

const runTerminal = (
  image: InstanceType<typeof Bun.Image>,
  terminal: PortingPipelineTerminal
): Effect.Effect<PortingWorkerSuccess["pipeline"], BunPortingError> =>
  Effect.gen(function* () {
    if (terminal === "metadata") {
      const metadata = yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to read image metadata.",
          }),
        try: () => image.metadata(),
      });
      return {
        metadata: {
          format: metadata.format,
          height: metadata.height,
          width: metadata.width,
        },
      };
    }

    if (terminal === "dataurl") {
      const dataUrl = yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to encode image dataurl.",
          }),
        try: () => image.dataurl(),
      });
      return { dataUrl };
    }

    const bytes = yield* Effect.tryPromise({
      catch: (cause) =>
        new BunPortingError({
          cause,
          message: "Failed to encode image bytes.",
        }),
      try: () => image.bytes(),
    });
    return {
      byteLength: bytes.byteLength,
      bytesBase64: Buffer.from(bytes).toString("base64"),
    };
  });

const probeImage = (
  input: Extract<PortingWorkerInput, { mode: "probe-image" }>
): Effect.Effect<
  PortingWorkerSuccess,
  BunPortingError,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    if (typeof Bun.Image !== "function") {
      return yield* failWorker(
        "Bun.Image is not available in this runtime.",
        "NO_BUN_IMAGE"
      );
    }

    const bytes = yield* loadSourceBytes(
      input.source,
      input.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES
    );
    const maxPixels = input.maxPixels ?? DEFAULT_MAX_PIXELS;

    const metadata = yield* Effect.tryPromise({
      catch: (cause) =>
        new BunPortingError({
          cause,
          code: "IMAGE_DECODE_FAILED",
          message:
            cause instanceof Error ? cause.message : "Unable to decode image.",
        }),
      try: () => new Bun.Image(bytes, { maxPixels }).metadata(),
    });

    const { width, height } = metadata;

    if (
      !(Number.isFinite(width) && Number.isFinite(height)) ||
      width <= 0 ||
      height <= 0
    ) {
      return yield* failWorker(
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
      success: true as const,
    };
  });

const executePipeline = (
  input: Extract<PortingWorkerInput, { mode: "execute-pipeline" }>
): Effect.Effect<
  PortingWorkerSuccess,
  BunPortingError,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    if (typeof Bun.Image !== "function") {
      return yield* failWorker(
        "Bun.Image is not available in this runtime.",
        "NO_BUN_IMAGE"
      );
    }

    const bytes = yield* loadSourceBytes(
      input.source,
      input.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES
    );
    const maxPixels = input.maxPixels ?? DEFAULT_MAX_PIXELS;

    const decoded = yield* Effect.try({
      catch: (cause) =>
        new BunPortingError({
          cause,
          code: "IMAGE_DECODE_FAILED",
          message:
            cause instanceof Error ? cause.message : "Unable to decode image.",
        }),
      try: () => new Bun.Image(bytes, { maxPixels }),
    });

    const image = yield* applyOperations(decoded, input.operations);

    const pipeline = yield* runTerminal(image, input.terminal).pipe(
      Effect.mapError(
        (cause) =>
          new BunPortingError({
            cause,
            code: "PIPELINE_TERMINAL_FAILED",
            message:
              cause instanceof BunPortingError
                ? cause.message
                : "Pipeline terminal failed.",
          })
      )
    );

    return {
      pipeline,
      runtime: runtimeInfo(),
      success: true as const,
    };
  });

const executePipelines = (
  input: Extract<PortingWorkerInput, { mode: "execute-pipelines" }>
): Effect.Effect<
  PortingWorkerSuccess,
  BunPortingError,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    if (typeof Bun.Image !== "function") {
      return yield* failWorker(
        "Bun.Image is not available in this runtime.",
        "NO_BUN_IMAGE"
      );
    }

    const bytes = yield* loadSourceBytes(
      input.source,
      input.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES
    );
    const maxPixels = input.maxPixels ?? DEFAULT_MAX_PIXELS;

    const pipelines: Record<string, PortingWorkerPipelineResult> = {};

    for (const [key, spec] of Object.entries(input.pipelines)) {
      const decoded = yield* Effect.try({
        catch: (cause) =>
          new BunPortingError({
            cause,
            code: "IMAGE_DECODE_FAILED",
            message:
              cause instanceof Error
                ? cause.message
                : "Unable to decode image.",
          }),
        try: () => new Bun.Image(bytes, { maxPixels }),
      });

      const image = yield* applyOperations(decoded, spec.operations);
      const pipelineResult = yield* runTerminal(image, spec.terminal).pipe(
        Effect.mapError(
          (cause) =>
            new BunPortingError({
              cause,
              code: "PIPELINE_TERMINAL_FAILED",
              message:
                cause instanceof BunPortingError
                  ? `${key}: ${cause.message}`
                  : `Pipeline terminal failed: ${key}`,
            })
        )
      );

      if (pipelineResult === undefined) {
        return yield* failWorker(
          `Pipeline produced no result: ${key}`,
          "PIPELINE_TERMINAL_FAILED"
        );
      }

      pipelines[key] = pipelineResult;
    }

    return {
      pipelines,
      runtime: runtimeInfo(),
      success: true as const,
    };
  });

const main = Effect.gen(function* () {
  const rawInput = yield* readStdin;
  const input = yield* parseInput(rawInput);

  if (input.mode === "probe-image") {
    return yield* probeImage(input);
  }

  if (input.mode === "execute-pipeline") {
    return yield* executePipeline(input);
  }

  if (input.mode === "execute-pipelines") {
    return yield* executePipelines(input);
  }

  return {
    runtime: runtimeInfo(),
    success: true as const,
  } satisfies PortingWorkerSuccess;
});

const exitWithResponse = (response: PortingWorkerResponse) =>
  Effect.promise(() => {
    writeResponse(response);
    return Promise.resolve(undefined as never);
  });

const exitWithFailure = (cause: unknown) =>
  Effect.promise(() => {
    writeFailure(
      cause instanceof BunPortingError ? cause.message : "Worker failed.",
      cause instanceof BunPortingError ? cause.code : "WORKER_UNHANDLED_ERROR"
    );
    return Promise.resolve(undefined as never);
  });

BunRuntime.runMain(
  main.pipe(
    Effect.matchEffect({
      onFailure: exitWithFailure,
      onSuccess: exitWithResponse,
    }),
    // Entry point: provide platform services once for the worker process.
    // @effect-diagnostics-next-line effect/strictEffectProvide:off
    Effect.provide(WorkerLayer)
  )
);
