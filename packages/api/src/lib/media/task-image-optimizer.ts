import { BunImage } from "@vyrel/bun-porting/image";
import { Effect } from "effect";

import {
  ImageOptimizeError,
  type OptimizedImageVariant,
  type OptimizedPreviewImages,
} from "./image-optimizer";

const TASK_IMAGE_THUMB_MAX_SIDE = 128;
const TASK_IMAGE_FULL_MAX_SIDE = 512;
const PLACEHOLDER_MAX_SIZE = 8;
const PLACEHOLDER_WEBP_QUALITY = 10;
const WEBP_CONTENT_TYPE = "image/webp" as const;
const MAX_PIXELS = 4096 * 4096;

const toVariant = (buffer: Uint8Array): OptimizedImageVariant => ({
  buffer,
  contentType: WEBP_CONTENT_TYPE,
});

export const optimizeTaskImages = (
  source: Buffer
): Effect.Effect<OptimizedPreviewImages, ImageOptimizeError> =>
  Effect.tryPromise({
    catch: (cause) => new ImageOptimizeError({ cause }),
    try: () =>
      BunImage.batch(source, {
        maxPixels: MAX_PIXELS,
        pipelines: {
          full: (img) =>
            img
              .resize(TASK_IMAGE_FULL_MAX_SIDE, TASK_IMAGE_FULL_MAX_SIDE, {
                filter: "lanczos3",
                fit: "inside",
                withoutEnlargement: false,
              })
              .webp({ quality: 86 }),
          placeholder: (img) =>
            img
              .resize(PLACEHOLDER_MAX_SIZE, PLACEHOLDER_MAX_SIZE, {
                fit: "inside",
              })
              .webp({ quality: PLACEHOLDER_WEBP_QUALITY }),
          thumb: (img) =>
            img
              .resize(TASK_IMAGE_THUMB_MAX_SIDE, TASK_IMAGE_THUMB_MAX_SIDE, {
                filter: "lanczos3",
                fit: "inside",
                withoutEnlargement: false,
              })
              .webp({ quality: 82 }),
        },
        terminals: { placeholder: "dataurl" },
      }).then(({ full, placeholder, thumb }) => ({
        full: toVariant(full),
        placeholder,
        thumb: toVariant(thumb),
      })),
  });
