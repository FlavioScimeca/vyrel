import { taskImageObjectKeys } from "@vyrel/storage/keys";
import { messageForObjectStorageFailure } from "@vyrel/storage/object-storage";
import { Effect } from "effect";
import { ObjectStorage } from "../../../effect/infrastructure/object-storage.service";
import {
  type ImageOptimizeError,
  messageForImageOptimizeError,
} from "../../../lib/media/image-optimizer";
import { optimizeTaskImages } from "../../../lib/media/task-image-optimizer";
import { TaskMediaError, TaskValidationError } from "../utils/errors";
import { validateTaskImageFile } from "../utils/validate-task-image";

export type TaskImageFields = {
  imageAssetId: string;
  imageFull: string;
  imagePlaceholder: string;
  imageThumb: string;
};

const mapImageOptimizeFailure = (error: ImageOptimizeError): TaskMediaError =>
  new TaskMediaError({
    cause: error,
    message: messageForImageOptimizeError(error),
  });

export const uploadTaskImage = (
  taskId: string,
  image: File
): Effect.Effect<
  TaskImageFields,
  TaskMediaError | TaskValidationError,
  ObjectStorage
> =>
  Effect.gen(function* () {
    const storage = yield* ObjectStorage;
    const validation = yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskMediaError({
          cause,
          message: "Unable to read the image.",
        }),
      try: () => validateTaskImageFile(image),
    });

    if (!validation.ok) {
      return yield* new TaskValidationError({
        message: validation.message,
      });
    }

    const keys = taskImageObjectKeys(taskId);
    const previews = yield* optimizeTaskImages(validation.file.buffer).pipe(
      Effect.mapError(mapImageOptimizeFailure)
    );

    yield* Effect.all(
      [
        storage.upload(keys.thumbKey, previews.thumb.buffer, {
          contentType: previews.thumb.contentType,
        }),
        storage.upload(keys.fullKey, previews.full.buffer, {
          contentType: previews.full.contentType,
        }),
      ],
      { concurrency: 2 }
    ).pipe(
      Effect.mapError(
        (error) =>
          new TaskMediaError({
            cause: error,
            message: messageForObjectStorageFailure(error),
          })
      )
    );

    return {
      imageAssetId: taskId,
      imageFull: keys.fullKey,
      imagePlaceholder: previews.placeholder,
      imageThumb: keys.thumbKey,
    };
  });

export const getSignedTaskImageUrl = (key: string | null) =>
  Effect.gen(function* () {
    if (key === null) {
      return;
    }
    const storage = yield* ObjectStorage;
    return storage.signedUrl(key);
  });
