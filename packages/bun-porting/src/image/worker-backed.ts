import { HttpClient, HttpClientResponse } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import type { FileSystem } from "@effect/platform/FileSystem";
import { type Clock, Effect } from "effect";
import type { ParseError } from "effect/ParseResult";

import { BunPortingError } from "../internal/errors";
import type {
  PortingImageOperation,
  PortingPipelineTerminal,
  PortingWorkerPipelineResult,
  PortingWorkerSource,
} from "../internal/protocol";
import { runPortingWorkerEffect } from "../internal/runner";
import { bunPortingRuntime } from "../internal/runtime";
import type {
  BunImageInput,
  BunImageJpegOptions,
  BunImageLike,
  BunImageMetadata,
  BunImageOptions,
  BunImageResizeOptions,
  BunImageWebpOptions,
} from "./types";

const DEFAULT_MAX_PIXELS = 16_777_216;
const DEFAULT_MAX_INPUT_BYTES = 25_000_000;

type WorkerServices =
  | HttpClient.HttpClient
  | FileSystem
  | CommandExecutor
  | Clock.Clock;

type WorkerError = BunPortingError | ParseError;

const toUint8Array = (
  input: BunImageInput
): Effect.Effect<Uint8Array, BunPortingError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    if (typeof input === "string") {
      return yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to read image path.",
          }),
        try: () => Bun.file(input).bytes(),
      });
    }
    if (typeof input === "object" && input !== null && "path" in input) {
      return yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to read image path.",
          }),
        try: () => Bun.file(input.path).bytes(),
      });
    }
    if (typeof input === "object" && input !== null && "url" in input) {
      const buffer = yield* HttpClient.get(input.url).pipe(
        Effect.flatMap(HttpClientResponse.filterStatusOk),
        Effect.flatMap((response) => response.arrayBuffer),
        Effect.scoped,
        Effect.mapError(
          (cause) =>
            new BunPortingError({
              cause,
              message: "Failed to download image.",
            })
        )
      );
      return new Uint8Array(buffer);
    }
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }
    if (input instanceof Blob) {
      return yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to read image blob.",
          }),
        try: () => input.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
      });
    }
    return input instanceof Uint8Array ? input : new Uint8Array(input);
  });

export const toPortingWorkerSource = (
  input: BunImageInput
): Effect.Effect<PortingWorkerSource, BunPortingError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    if (typeof input === "object" && input !== null && "url" in input) {
      return { type: "url" as const, url: input.url };
    }
    if (typeof input === "object" && input !== null && "path" in input) {
      return { path: input.path, type: "path" as const };
    }
    if (typeof input === "string") {
      return { path: input, type: "path" as const };
    }

    const bytes = yield* toUint8Array(input);
    return {
      data: Buffer.from(bytes).toString("base64"),
      type: "bytes-base64" as const,
    };
  });

export const pipelineBytesFromResult = (
  pipeline: PortingWorkerPipelineResult
): Effect.Effect<Uint8Array, BunPortingError> => {
  if (pipeline.bytesBase64 === undefined) {
    return new BunPortingError({ message: "porting-worker bytes missing." });
  }
  return Effect.succeed(Buffer.from(pipeline.bytesBase64, "base64"));
};

const toSource = toPortingWorkerSource;

const pipelineBytes = pipelineBytesFromResult;

/**
 * Worker-backed Bun.Image facade: queues chainable ops and executes them in one
 * spawn when a terminal method is awaited.
 */
export class WorkerBackedBunImage implements BunImageLike {
  private readonly input: BunImageInput;
  private readonly options: BunImageOptions;
  private readonly operations: PortingImageOperation[];
  private cachedWidth = -1;
  private cachedHeight = -1;

  constructor(
    input: BunImageInput,
    options?: BunImageOptions,
    operations: PortingImageOperation[] = []
  ) {
    this.input = input;
    this.options = options ?? {};
    this.operations = operations;
  }

  private clone(operations: PortingImageOperation[]): WorkerBackedBunImage {
    return new WorkerBackedBunImage(this.input, this.options, operations);
  }

  resize(
    width: number,
    height?: number,
    options?: BunImageResizeOptions
  ): BunImageLike {
    return this.clone([
      ...this.operations,
      {
        height,
        op: "resize",
        options,
        width,
      },
    ]);
  }

  webp(options?: BunImageWebpOptions): BunImageLike {
    return this.clone([...this.operations, { op: "webp", options }]);
  }

  jpeg(options?: BunImageJpegOptions): BunImageLike {
    return this.clone([...this.operations, { op: "jpeg", options }]);
  }

  png(options?: Record<string, unknown>): BunImageLike {
    return this.clone([...this.operations, { op: "png", options }]);
  }

  private executeEffect(
    terminal: PortingPipelineTerminal
  ): Effect.Effect<PortingWorkerPipelineResult, WorkerError, WorkerServices> {
    const { input, options, operations } = this;
    const self = this;

    return Effect.gen(function* () {
      const source = yield* toSource(input);
      const run = yield* runPortingWorkerEffect({
        maxInputBytes: DEFAULT_MAX_INPUT_BYTES,
        maxPixels: options.maxPixels ?? DEFAULT_MAX_PIXELS,
        mode: "execute-pipeline",
        operations,
        source,
        terminal,
      });

      if (!run.ok) {
        return yield* new BunPortingError({
          code: run.code,
          message: run.error,
        });
      }

      if (run.result.pipeline === undefined) {
        return yield* new BunPortingError({
          message: "porting-worker returned no pipeline result.",
        });
      }

      const { metadata } = run.result.pipeline;
      if (metadata !== undefined) {
        self.cachedWidth = metadata.width;
        self.cachedHeight = metadata.height;
      }

      return run.result.pipeline;
    });
  }

  metadata(): Promise<BunImageMetadata> {
    return bunPortingRuntime.runPromise(
      this.executeEffect("metadata").pipe(
        Effect.flatMap((pipeline) => {
          if (pipeline.metadata === undefined) {
            return new BunPortingError({
              message: "porting-worker metadata missing.",
            });
          }
          return Effect.succeed(pipeline.metadata);
        })
      )
    );
  }

  bytes(): Promise<Uint8Array> {
    return bunPortingRuntime.runPromise(
      this.executeEffect("bytes").pipe(Effect.flatMap(pipelineBytes))
    );
  }

  buffer(): Promise<ArrayBuffer> {
    return bunPortingRuntime.runPromise(
      this.executeEffect("bytes").pipe(
        Effect.flatMap(pipelineBytes),
        Effect.map(
          (bytes) =>
            bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength
            ) as ArrayBuffer
        )
      )
    );
  }

  blob(): Promise<Blob> {
    return bunPortingRuntime.runPromise(
      this.executeEffect("bytes").pipe(
        Effect.flatMap(pipelineBytes),
        Effect.map(
          (bytes) =>
            new Blob([
              bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset + bytes.byteLength
              ) as ArrayBuffer,
            ])
        )
      )
    );
  }

  dataurl(): Promise<string> {
    return bunPortingRuntime.runPromise(
      this.executeEffect("dataurl").pipe(
        Effect.flatMap((pipeline) => {
          if (pipeline.dataUrl === undefined) {
            return new BunPortingError({
              message: "porting-worker dataurl missing.",
            });
          }
          return Effect.succeed(pipeline.dataUrl);
        })
      )
    );
  }

  get width(): number {
    return this.cachedWidth;
  }

  get height(): number {
    return this.cachedHeight;
  }
}
