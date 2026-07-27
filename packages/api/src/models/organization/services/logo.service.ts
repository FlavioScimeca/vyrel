import { organizationLogoObjectKeys } from "@vyrel/storage/keys";
import { Effect } from "effect";
import { ObjectStorage } from "../../../effect/infrastructure/object-storage.service";
import {
  type ImageOptimizeError,
  messageForImageOptimizeError,
} from "../../../lib/media/image-optimizer";
import { optimizeOrganizationLogoImages } from "../../../lib/media/organization-logo-optimizer";
import {
  OrganizationMediaError,
  OrganizationValidationError,
} from "../utils/errors";
import { validateOrganizationLogoFile } from "../utils/validate-organization-logo";

export type OrganizationLogoFields = {
  imageAssetId: string;
  imageFull: string;
  imagePlaceholder: string;
  imageThumb: string;
};

const mapImageOptimizeFailure = (
  error: ImageOptimizeError
): OrganizationMediaError =>
  new OrganizationMediaError({
    cause: error,
    message: messageForImageOptimizeError(error),
  });

export const uploadOrganizationLogo = (
  organizationId: string,
  logo: File
): Effect.Effect<
  OrganizationLogoFields,
  OrganizationMediaError | OrganizationValidationError,
  ObjectStorage
> =>
  Effect.gen(function* () {
    const storage = yield* ObjectStorage;
    const validation = yield* Effect.tryPromise({
      catch: (cause) =>
        new OrganizationMediaError({
          cause,
          message: "Unable to read the logo image.",
        }),
      try: () => validateOrganizationLogoFile(logo),
    });

    if (!validation.ok) {
      return yield* new OrganizationValidationError({
        message: validation.message,
      });
    }

    const keys = organizationLogoObjectKeys(organizationId);
    const previews = yield* optimizeOrganizationLogoImages(
      validation.file.buffer
    ).pipe(Effect.mapError(mapImageOptimizeFailure));

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
          new OrganizationMediaError({
            cause: error,
            message: "Unable to store logo in object storage.",
          })
      )
    );

    return {
      imageAssetId: organizationId,
      imageFull: keys.fullKey,
      imagePlaceholder: previews.placeholder,
      imageThumb: keys.thumbKey,
    };
  });

export const getSignedOrganizationImageUrl = (key: string | null) =>
  Effect.gen(function* () {
    if (key === null) {
      return;
    }
    const storage = yield* ObjectStorage;
    return storage.signedUrl(key);
  });
