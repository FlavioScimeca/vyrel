import { Effect } from "effect";

import { isNativeImageAvailable } from "../bootstrap/config";
import { BunPortingError } from "../internal/errors";
import type {
  PortingImageOperation,
  PortingPipelineSpec,
  PortingPipelineTerminal,
  PortingWorkerPipelineResult,
} from "../internal/protocol";
import { runPortingWorkerEffect } from "../internal/runner";
import { bunPortingRuntime } from "../internal/runtime";
import { PipelineBuilder } from "./pipeline-builder";
import type { BunImageInput, BunImageMetadata } from "./types";
import {
  pipelineBytesFromResult,
  toPortingWorkerSource,
} from "./worker-backed";

const DEFAULT_MAX_PIXELS = 16_777_216;
const DEFAULT_MAX_INPUT_BYTES = 25_000_000;

export type BunImageBatchPipelines = Record<
  string,
  (img: PipelineBuilder) => PipelineBuilder
>;

export type BunImageBatchOptions<P extends BunImageBatchPipelines> = {
  maxPixels?: number;
  pipelines: P;
  terminals?: Partial<Record<keyof P & string, PortingPipelineTerminal>>;
};

type BatchValueForTerminal<T extends PortingPipelineTerminal> =
  T extends "dataurl"
    ? string
    : T extends "metadata"
      ? BunImageMetadata
      : T extends "blob"
        ? Blob
        : T extends "buffer"
          ? ArrayBuffer
          : Uint8Array;

export type BunImageBatchResult<
  P extends BunImageBatchPipelines,
  T extends
    | Partial<Record<keyof P & string, PortingPipelineTerminal>>
    | undefined,
> = {
  [K in keyof P]: K extends keyof NonNullable<T>
    ? NonNullable<T>[K] extends PortingPipelineTerminal
      ? BatchValueForTerminal<NonNullable<T>[K]>
      : Uint8Array
    : Uint8Array;
};

const resolveTerminal = <P extends BunImageBatchPipelines>(
  key: keyof P & string,
  terminals:
    | Partial<Record<keyof P & string, PortingPipelineTerminal>>
    | undefined
): PortingPipelineTerminal => terminals?.[key] ?? "bytes";

const collectPipelineSpecs = <P extends BunImageBatchPipelines>(
  pipelines: P,
  terminals:
    | Partial<Record<keyof P & string, PortingPipelineTerminal>>
    | undefined
): Record<string, PortingPipelineSpec> => {
  const specs: Record<string, PortingPipelineSpec> = {};
  for (const key of Object.keys(pipelines) as (keyof P & string)[]) {
    const build = pipelines[key];
    if (build === undefined) {
      continue;
    }
    specs[key] = {
      operations: build(new PipelineBuilder()).toOperations(),
      terminal: resolveTerminal(key, terminals),
    };
  }
  return specs;
};

const applyOperationsNative = (
  image: InstanceType<typeof Bun.Image>,
  operations: PortingImageOperation[]
): InstanceType<typeof Bun.Image> => {
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
    }
  }
  return current;
};

const toNativeInput = (
  input: BunImageInput
): Effect.Effect<Buffer | Uint8Array | string | Blob, BunPortingError> => {
  if (typeof input === "object" && input !== null && "path" in input) {
    return Effect.succeed(input.path);
  }
  if (typeof input === "object" && input !== null && "url" in input) {
    return new BunPortingError({
      message:
        "URL sources are only supported via worker-backed BunImage.batch (pass bytes or path for native).",
    });
  }
  if (input instanceof ArrayBuffer) {
    return Effect.succeed(new Uint8Array(input));
  }
  return Effect.succeed(input);
};

type BatchTerminalValue =
  | string
  | Uint8Array
  | ArrayBuffer
  | Blob
  | BunImageMetadata;

const runNativeTerminal = (
  image: InstanceType<typeof Bun.Image>,
  terminal: PortingPipelineTerminal
): Effect.Effect<BatchTerminalValue, BunPortingError> =>
  Effect.gen(function* () {
    if (terminal === "metadata") {
      return yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to read native image metadata.",
          }),
        try: () => image.metadata(),
      });
    }
    if (terminal === "dataurl") {
      return yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to encode native image dataurl.",
          }),
        try: () => image.dataurl(),
      });
    }
    if (terminal === "blob") {
      return yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to encode native image blob.",
          }),
        try: () => image.blob(),
      });
    }
    if (terminal === "buffer") {
      const buf = yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to read native image buffer.",
          }),
        try: () => image.buffer(),
      });
      return buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
    }
    return yield* Effect.tryPromise({
      catch: (cause) =>
        new BunPortingError({
          cause,
          message: "Failed to encode native image bytes.",
        }),
      try: () => image.bytes(),
    });
  });

const decodeWorkerPipelineValue = (
  pipeline: PortingWorkerPipelineResult,
  terminal: PortingPipelineTerminal
): Effect.Effect<BatchTerminalValue, BunPortingError> =>
  Effect.gen(function* () {
    if (terminal === "metadata") {
      if (pipeline.metadata === undefined) {
        return yield* new BunPortingError({
          message: "porting-worker metadata missing.",
        });
      }
      return pipeline.metadata;
    }

    if (terminal === "dataurl") {
      if (pipeline.dataUrl === undefined) {
        return yield* new BunPortingError({
          message: "porting-worker dataurl missing.",
        });
      }
      return pipeline.dataUrl;
    }

    const bytes = yield* pipelineBytesFromResult(pipeline);

    if (terminal === "blob") {
      return new Blob([
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer,
      ]);
    }

    if (terminal === "buffer") {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer;
    }

    return bytes;
  });

const runBatchNative = (
  source: BunImageInput,
  specs: Record<string, PortingPipelineSpec>,
  maxPixels: number
): Effect.Effect<Record<string, unknown>, BunPortingError> =>
  Effect.gen(function* () {
    const nativeInput = yield* toNativeInput(source);
    const entries = Object.entries(specs);

    const results = yield* Effect.all(
      entries.map(([key, spec]) =>
        Effect.gen(function* () {
          const image = yield* Effect.try({
            catch: (cause) =>
              new BunPortingError({
                cause,
                message: `Failed to decode native image for pipeline "${key}".`,
              }),
            try: () =>
              applyOperationsNative(
                new Bun.Image(nativeInput, { maxPixels }),
                spec.operations
              ),
          });
          const value = yield* runNativeTerminal(image, spec.terminal);
          return [key, value] as const;
        })
      ),
      { concurrency: "unbounded" }
    );

    return Object.fromEntries(results);
  });

const runBatchWorker = (
  source: BunImageInput,
  specs: Record<string, PortingPipelineSpec>,
  maxPixels: number
) =>
  Effect.gen(function* () {
    const workerSource = yield* toPortingWorkerSource(source);
    const run = yield* runPortingWorkerEffect({
      maxInputBytes: DEFAULT_MAX_INPUT_BYTES,
      maxPixels,
      mode: "execute-pipelines",
      pipelines: specs,
      source: workerSource,
    });

    if (!run.ok) {
      return yield* new BunPortingError({
        code: run.code,
        message: run.error,
      });
    }

    const { pipelines } = run.result;
    if (pipelines === undefined) {
      return yield* new BunPortingError({
        message: "porting-worker returned no pipelines result.",
      });
    }

    const out: Record<string, unknown> = {};
    for (const [key, spec] of Object.entries(specs)) {
      const pipeline = pipelines[key];
      if (pipeline === undefined) {
        return yield* new BunPortingError({
          message: `porting-worker missing pipeline result for "${key}".`,
        });
      }
      out[key] = yield* decodeWorkerPipelineValue(pipeline, spec.terminal);
    }
    return out;
  });

/**
 * Run multiple Bun.Image-style pipelines against one source.
 *
 * - Native host: N in-process `Bun.Image` chains (concurrent via `Effect.all`).
 * - Worker host: one `execute-pipelines` spawn (single decode, N encodes).
 */
export const runBunImageBatch = <
  P extends BunImageBatchPipelines,
  const T extends
    | Partial<Record<keyof P & string, PortingPipelineTerminal>>
    | undefined = undefined,
>(
  source: BunImageInput,
  options: BunImageBatchOptions<P> & { terminals?: T }
): Promise<BunImageBatchResult<P, T>> =>
  bunPortingRuntime.runPromise(
    Effect.gen(function* () {
      const maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
      const specs = collectPipelineSpecs(options.pipelines, options.terminals);

      if (Object.keys(specs).length === 0) {
        return yield* new BunPortingError({
          message: "BunImage.batch requires at least one pipeline.",
        });
      }

      const result = isNativeImageAvailable()
        ? yield* runBatchNative(source, specs, maxPixels)
        : yield* runBatchWorker(source, specs, maxPixels);

      return result as BunImageBatchResult<P, T>;
    })
  );
