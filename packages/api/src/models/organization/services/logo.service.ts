import { organizationLogoObjectKeys } from "@vyrel/storage/keys";
import { uploadObject } from "@vyrel/storage/object-storage";
import { Effect } from "effect";

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
  OrganizationMediaError | OrganizationValidationError
> =>
  Effect.gen(function* () {
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
