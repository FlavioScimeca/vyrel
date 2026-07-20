import { BunImage } from "@vyrel/bun-porting/image";
import { Effect } from "effect";

import {
  ImageOptimizeError,
  type OptimizedImageVariant,
  type OptimizedPreviewImages,
} from "./image-optimizer";

const TASK_IMAGE_THUMB_MAX_SIDE = 128;
const TASK_IMAGE_FULL_MAX_SIDE = 512;
const WEBP_CONTENT_TYPE = "image/webp" as const;

function createSourceImage(source: Buffer) {
  return new BunImage(source, { maxPixels: 4096 * 4096 });
}

const encodeVariant = (
  source: ReturnType<typeof createSourceImage>,
  maxSide: number,
  quality: number
) =>
  Effect.tryPromise({
    catch: (cause) => new ImageOptimizeError({ cause }),
    try: () =>
      source
        .resize(maxSide, maxSide, {
          filter: "lanczos3",
          fit: "inside",
          withoutEnlargement: false,
        })
        .webp({ quality })
        .bytes(),
  }).pipe(
    Effect.map(
      (buffer): OptimizedImageVariant => ({
        buffer,
        contentType: WEBP_CONTENT_TYPE,
      })
    )
  );

export const optimizeTaskImages = (
  source: Buffer
): Effect.Effect<OptimizedPreviewImages, ImageOptimizeError> =>
  Effect.gen(function* () {
    const image = createSourceImage(source);
    const [thumb, full] = yield* Effect.all([
      encodeVariant(image, TASK_IMAGE_THUMB_MAX_SIDE, 82),
      encodeVariant(image, TASK_IMAGE_FULL_MAX_SIDE, 86),
    ]);

    return { full, thumb };
  });
