import { isNativeImageAvailable as hostHasNativeImage } from "../bootstrap/config";
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
