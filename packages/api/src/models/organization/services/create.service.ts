import { Effect } from "effect";
import type { ObjectStorage } from "../../../effect/infrastructure/object-storage.service";
import {
  afterCreateAttachMedia,
  type WithMediaWarning,
} from "../../../lib/after-create-attach-media";
import { mergeSessionHeaders } from "../../user/utils/session-headers";
import {
  type OrganizationTypeCreate,
  organizationCreateSchema,
} from "../types/base.types";
import {
  type OrganizationError,
  OrganizationValidationError,
} from "../utils/errors";
import {
  type CreateOrganizationResult,
  createAuthOrganization,
  updateAuthOrganization,
} from "./auth.service";
import { uploadOrganizationLogo } from "./logo.service";

export type CreateOrganizationServiceResult =
  WithMediaWarning<CreateOrganizationResult>;

export const createOrganization = (
  input: OrganizationTypeCreate,
  requestHeaders: Headers
): Effect.Effect<
  CreateOrganizationServiceResult,
  OrganizationError,
  ObjectStorage
> =>
  Effect.gen(function* () {
    const safeValues = organizationCreateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new OrganizationValidationError({
        issues: safeValues.error.issues,
        message: "Invalid organization values.",
      });
    }

    const { logo, name, slug } = safeValues.data;
    const created = yield* createAuthOrganization(
      { name, slug },
      requestHeaders
    );

    if (logo === undefined) {
      return created satisfies CreateOrganizationServiceResult;
    }

    return yield* afterCreateAttachMedia(
      created,
      Effect.gen(function* () {
        const imageFields = yield* uploadOrganizationLogo(
          created.organization.id,
          logo
        );
        const sessionHeaders = mergeSessionHeaders(
          requestHeaders,
          created.setCookies
        );

        yield* updateAuthOrganization(
          {
            data: imageFields,
            organizationId: created.organization.id,
          },
          sessionHeaders,
          "Unable to save logo."
        );

        return {
          organization: {
            ...created.organization,
            ...imageFields,
          },
          setCookies: created.setCookies,
        } satisfies CreateOrganizationResult;
      })
    );
  });
