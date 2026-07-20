import { BunImage } from "@vyrel/bun-porting/image";
import { Data, Effect } from "effect";

const THUMB_MAX_WIDTH = 480;
const THUMB_MAX_HEIGHT = 600;
const FULL_MAX_WIDTH = 1600;

/** Max decoded pixel count (width × height). 8192² covers common print exports like 5000×5000. */
export const MAX_IMAGE_PIXELS = 8192 * 8192;
export const MAX_IMAGE_PIXELS_PER_SIDE = 8192;

const WEBP_CONTENT_TYPE = "image/webp" as const;

const PLACEHOLDER_MAX_SIZE = 8;
const PLACEHOLDER_WEBP_QUALITY = 10;

export interface OptimizedImageVariant {
  buffer: Uint8Array;
  contentType: typeof WEBP_CONTENT_TYPE;
}

export type OptimizedPreviewImages = {
  full: OptimizedImageVariant;
  thumb: OptimizedImageVariant;
  placeholder: string;
};

/** Preview variants without placeholder (design uploads). */
export type OptimizedPreviewVariants = {
  full: OptimizedImageVariant;
  thumb: OptimizedImageVariant;
};

export class ImageOptimizeError extends Data.TaggedError("ImageOptimizeError")<{
  cause: unknown;
}> {}

function unwrapErrorCause(error: unknown): unknown {
  let current = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (!(current instanceof Error) || current.cause === undefined) {
      return current;
    }
    current = current.cause;
  }
  return current;
}

/** User-facing message for preview/placeholder generation failures. */
export function messageForImageOptimizeError(
  error: ImageOptimizeError
): string {
  const root = unwrapErrorCause(error.cause);
  const code =
    root !== null &&
    typeof root === "object" &&
    "code" in root &&
    typeof root.code === "string"
      ? root.code
      : undefined;

  const messages: Record<string, string> = {
    ERR_IMAGE_DECODE_FAILED:
      "The image could not be decoded. It may be corrupt or use an unsupported color profile.",
    ERR_IMAGE_ENCODE_FAILED:
      "The image could not be converted to WebP for previews.",
    ERR_IMAGE_FORMAT_UNSUPPORTED:
      "This image format is not supported for design uploads.",
    ERR_IMAGE_TOO_MANY_PIXELS: `Image is too large to process (max ${MAX_IMAGE_PIXELS_PER_SIDE}×${MAX_IMAGE_PIXELS_PER_SIDE} pixels). Resize the file and try again.`,
    ERR_IMAGE_UNKNOWN_FORMAT:
      "File is not a readable PNG, WebP, or JPEG image.",
  };

  if (code !== undefined) {
    const message = messages[code];
    if (message !== undefined) {
      return message;
    }
  }

  return "Unable to optimize design preview images.";
}

const toVariant = (buffer: Uint8Array): OptimizedImageVariant => ({
  buffer,
  contentType: WEBP_CONTENT_TYPE,
});

export const encodeImagePlaceholder = (
  sourcePng: Buffer
): Effect.Effect<string, ImageOptimizeError> =>
  Effect.tryPromise({
    catch: (cause) => new ImageOptimizeError({ cause }),
    try: async () => {
      const { placeholder } = await BunImage.batch(sourcePng, {
        maxPixels: MAX_IMAGE_PIXELS,
        pipelines: {
          placeholder: (img) =>
            img
              .resize(PLACEHOLDER_MAX_SIZE, PLACEHOLDER_MAX_SIZE, {
                fit: "inside",
              })
              .webp({ quality: PLACEHOLDER_WEBP_QUALITY }),
        },
        terminals: { placeholder: "dataurl" },
      });
      return placeholder;
    },
  });

export const optimizePreviewImages = (
  sourcePng: Buffer
): Effect.Effect<OptimizedPreviewVariants, ImageOptimizeError> =>
  Effect.tryPromise({
    catch: (cause) => new ImageOptimizeError({ cause }),
    try: async () => {
      const { full, thumb } = await BunImage.batch(sourcePng, {
        maxPixels: MAX_IMAGE_PIXELS,
        pipelines: {
          full: (img) =>
            img
              .resize(FULL_MAX_WIDTH, undefined, {
                filter: "lanczos3",
                withoutEnlargement: true,
              })
              .webp({ quality: 85 }),
          thumb: (img) =>
            img
              .resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, {
                filter: "lanczos3",
                fit: "inside",
                withoutEnlargement: true,
              })
              .webp({ quality: 80 }),
        },
      });
      return { full: toVariant(full), thumb: toVariant(thumb) };
    },
  });
