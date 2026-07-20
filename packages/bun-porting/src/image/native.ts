import type {
  BunImageInput,
  BunImageJpegOptions,
  BunImageLike,
  BunImageMetadata,
  BunImageOptions,
  BunImageResizeOptions,
  BunImageWebpOptions,
} from "./types";

const toNativeInput = (
  input: BunImageInput
): Buffer | Uint8Array | string | Blob => {
  if (typeof input === "object" && input !== null && "path" in input) {
    return input.path;
  }
  if (typeof input === "object" && input !== null && "url" in input) {
    throw new Error(
      "URL sources are only supported via worker-backed BunImage (pass bytes or path for native)."
    );
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  return input;
};

/**
 * Thin wrapper around native `Bun.Image` when available on the host runtime.
 */
export class NativeBunImage implements BunImageLike {
  private readonly image: InstanceType<typeof Bun.Image>;

  constructor(input: BunImageInput, options?: BunImageOptions) {
    this.image = new Bun.Image(toNativeInput(input), options);
  }

  private static wrap(image: InstanceType<typeof Bun.Image>): NativeBunImage {
    const instance = Object.create(NativeBunImage.prototype) as NativeBunImage;
    Object.defineProperty(instance, "image", {
      value: image,
      writable: false,
    });
    return instance;
  }

  resize(
    width: number,
    height?: number,
    options?: BunImageResizeOptions
  ): BunImageLike {
    return NativeBunImage.wrap(this.image.resize(width, height, options));
  }

  webp(options?: BunImageWebpOptions): BunImageLike {
    return NativeBunImage.wrap(this.image.webp(options));
  }

  jpeg(options?: BunImageJpegOptions): BunImageLike {
    return NativeBunImage.wrap(this.image.jpeg(options));
  }

  png(options?: Record<string, unknown>): BunImageLike {
    return NativeBunImage.wrap(this.image.png(options));
  }

  metadata(): Promise<BunImageMetadata> {
    return this.image.metadata();
  }

  bytes(): Promise<Uint8Array> {
    return this.image.bytes();
  }

  async buffer(): Promise<ArrayBuffer> {
    const buf = await this.image.buffer();
    return buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
  }

  blob(): Promise<Blob> {
    return this.image.blob();
  }

  dataurl(): Promise<string> {
    return this.image.dataurl();
  }

  get width(): number {
    return this.image.width;
  }

  get height(): number {
    return this.image.height;
  }
}
