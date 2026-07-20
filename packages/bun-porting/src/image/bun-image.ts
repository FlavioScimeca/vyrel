import { isNativeImageAvailable as hostHasNativeImage } from "../bootstrap/config";
import type { PortingPipelineTerminal } from "../internal/protocol";
import {
  type BunImageBatchOptions,
  type BunImageBatchPipelines,
  type BunImageBatchResult,
  runBunImageBatch,
} from "./batch";
import { NativeBunImage } from "./native";
import type {
  BunImageInput,
  BunImageJpegOptions,
  BunImageLike,
  BunImageMetadata,
  BunImageOptions,
  BunImageResizeOptions,
  BunImageWebpOptions,
} from "./types";
import { WorkerBackedBunImage } from "./worker-backed";

export type {
  BunImageBatchOptions,
  BunImageBatchPipelines,
  BunImageBatchResult,
} from "./batch";
export type { PipelineBuilder } from "./pipeline-builder";
export type {
  BunImageInput,
  BunImageJpegOptions,
  BunImageLike,
  BunImageMetadata,
  BunImageOptions,
  BunImageResizeOptions,
  BunImageWebpOptions,
} from "./types";

/** Whether the host Bun runtime exposes `Bun.Image`. */
export const isNativeImageAvailable = (): boolean => hostHasNativeImage();

/**
 * Drop-in facade for `Bun.Image`.
 *
 * - Host has Bun.Image → delegates natively (local Bun 1.3.14+).
 * - Host lacks Bun.Image → serializes the chain and runs it in porting-worker.
 */
export class BunImage implements BunImageLike {
  private readonly impl: BunImageLike;

  constructor(input: BunImageInput, options?: BunImageOptions) {
    this.impl = hostHasNativeImage()
      ? new NativeBunImage(input, options)
      : new WorkerBackedBunImage(input, options);
  }

  /**
   * Run multiple pipelines against one source.
   *
   * Callbacks only record ops (like a lazy Bun.Image chain). Terminals default
   * to `bytes`; override per key via `terminals`.
   */
  static batch<
    P extends BunImageBatchPipelines,
    const T extends
      | Partial<Record<keyof P & string, PortingPipelineTerminal>>
      | undefined = undefined,
  >(
    source: BunImageInput,
    options: BunImageBatchOptions<P> & { terminals?: T }
  ): Promise<BunImageBatchResult<P, T>> {
    return runBunImageBatch(source, options) as Promise<
      BunImageBatchResult<P, T>
    >;
  }

  resize(
    width: number,
    height?: number,
    options?: BunImageResizeOptions
  ): BunImageLike {
    return this.impl.resize(width, height, options);
  }

  webp(options?: BunImageWebpOptions): BunImageLike {
    return this.impl.webp(options);
  }

  jpeg(options?: BunImageJpegOptions): BunImageLike {
    return this.impl.jpeg(options);
  }

  png(options?: Record<string, unknown>): BunImageLike {
    return this.impl.png(options);
  }

  metadata(): Promise<BunImageMetadata> {
    return this.impl.metadata();
  }

  bytes(): Promise<Uint8Array> {
    return this.impl.bytes();
  }

  buffer(): Promise<ArrayBuffer> {
    return this.impl.buffer();
  }

  blob(): Promise<Blob> {
    return this.impl.blob();
  }

  dataurl(): Promise<string> {
    return this.impl.dataurl();
  }

  get width(): number {
    return this.impl.width;
  }

  get height(): number {
    return this.impl.height;
  }
}
