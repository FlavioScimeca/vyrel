import { userAvatarObjectKeys } from "@vyrel/storage/keys";
import { uploadObject } from "@vyrel/storage/object-storage";
import { Effect } from "effect";

import {
  type ImageOptimizeError,
  messageForImageOptimizeError,
} from "../../../lib/media/image-optimizer";
import { optimizeUserAvatarImages } from "../../../lib/media/user-avatar-optimizer";
import { UserMediaError, UserValidationError } from "../utils/errors";
import { validateUserAvatarFile } from "../utils/validate-user-avatar";

export type UserAvatarFields = {
  imageAssetId: string;
  imageFull: string;
  imagePlaceholder: string;
  imageThumb: string;
};

const mapImageOptimizeFailure = (error: ImageOptimizeError): UserMediaError =>
  new UserMediaError({
    cause: error,
    message: messageForImageOptimizeError(error),
  });

export const uploadUserAvatar = (
  userId: string,
  avatar: File
): Effect.Effect<UserAvatarFields, UserMediaError | UserValidationError> =>
  Effect.gen(function* () {
    const validation = yield* Effect.tryPromise({
      catch: (cause) =>
        new UserMediaError({
          cause,
          message: "Unable to read the avatar image.",
        }),
      try: () => validateUserAvatarFile(avatar),
    });

    if (!validation.ok) {
      return yield* new UserValidationError({
        message: validation.message,
      });
    }

    const keys = userAvatarObjectKeys(userId);
    const previews = yield* optimizeUserAvatarImages(
      validation.file.buffer
    ).pipe(Effect.mapError(mapImageOptimizeFailure));

    yield* Effect.all(
      [
        uploadObject(keys.thumbKey, previews.thumb.buffer, {
          contentType: previews.thumb.contentType,
        }),
        uploadObject(keys.fullKey, previews.full.buffer, {
          contentType: previews.full.contentType,
        }),
      ],
      { concurrency: 2 }
    ).pipe(
      Effect.mapError(
        (error) =>
          new UserMediaError({
            cause: error,
            message: "Unable to store avatar in object storage.",
          })
      )
    );

    return {
      imageAssetId: userId,
      imageFull: keys.fullKey,
      imagePlaceholder: previews.placeholder,
      imageThumb: keys.thumbKey,
    };
  });
