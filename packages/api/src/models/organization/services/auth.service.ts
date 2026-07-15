import { auth } from "@vyrel/auth";
import { APIError } from "better-auth/api";
import { Effect } from "effect";

import { readSetCookieHeaders } from "../../user/utils/session-headers";
import { mapOrganizationAuthApiFailure } from "../utils/auth-api";
import {
  OrganizationRepositoryError,
  OrganizationValidationError,
} from "../utils/errors";

export type AuthOrganizationProfile = {
  createdAt: Date;
  id: string;
  imageAssetId: string | null;
  imageFull: string | null;
  imagePlaceholder: string | null;
  imageThumb: string | null;
  logo: string | null;
  metadata: string | null;
  name: string;
  slug: string;
};

export type CreateOrganizationInput = {
  name: string;
  slug: string;
};

export type CreateOrganizationResult = {
  organization: AuthOrganizationProfile;
  setCookies: string[];
};

export type UpdateOrganizationBody = {
  imageAssetId?: string;
  imageFull?: string;
  imagePlaceholder?: string;
  imageThumb?: string;
  logo?: string | null;
  metadata?: Record<string, unknown>;
  name?: string;
  slug?: string;
};

export type UpdateOrganizationInput = {
  data: UpdateOrganizationBody;
  organizationId: string;
};

export type DeleteOrganizationInput = {
  organizationId: string;
};

type CreateOrganizationResponseBody = AuthOrganizationProfile & {
  members?: unknown[];
};

function normalizeMetadata(value: CreateOrganizationResponseBody["metadata"]) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return JSON.stringify(value);
}

function sanitizeOrganization(
  value: CreateOrganizationResponseBody
): AuthOrganizationProfile {
  return {
    createdAt: value.createdAt,
    id: value.id,
    imageAssetId: value.imageAssetId ?? null,
    imageFull: value.imageFull ?? null,
    imagePlaceholder: value.imagePlaceholder ?? null,
    imageThumb: value.imageThumb ?? null,
    logo: value.logo ?? null,
    metadata: normalizeMetadata(value.metadata),
    name: value.name,
    slug: value.slug,
  };
}

function mapCreateOrganizationFailure(
  cause: unknown
): OrganizationValidationError {
  if (cause instanceof APIError) {
    return new OrganizationValidationError({
      cause,
      message: cause.message ?? "Unable to create organization.",
    });
  }

  return new OrganizationValidationError({
    cause,
    message: "Unable to create organization.",
  });
}

export const createAuthOrganization = (
  input: CreateOrganizationInput,
  headers: Headers
): Effect.Effect<
  CreateOrganizationResult,
  OrganizationRepositoryError | OrganizationValidationError
> =>
  Effect.gen(function* () {
    const createResponse = yield* Effect.tryPromise({
      catch: (cause) => mapCreateOrganizationFailure(cause),
      try: () =>
        auth.api.createOrganization({
          asResponse: true,
          body: input,
          headers,
        }),
    });

    const createBody = (yield* Effect.tryPromise({
      catch: (cause) =>
        new OrganizationRepositoryError({
          cause,
          message: "Organization was created but the response was invalid.",
        }),
      try: () =>
        createResponse.json() as Promise<
          CreateOrganizationResponseBody | { message?: string }
        >,
    })) as CreateOrganizationResponseBody | { message?: string };

    if (!createResponse.ok) {
      return yield* new OrganizationValidationError({
        message:
          "message" in createBody && typeof createBody.message === "string"
            ? createBody.message
            : "Unable to create organization.",
      });
    }

    const createPayload = createBody as CreateOrganizationResponseBody;

    return {
      organization: sanitizeOrganization(createPayload),
      setCookies: readSetCookieHeaders(createResponse),
    };
  });

export const updateAuthOrganization = (
  input: UpdateOrganizationInput,
  headers: Headers,
  fallbackMessage = "Unable to update organization."
) =>
  Effect.tryPromise({
    catch: (cause) => mapOrganizationAuthApiFailure(cause, fallbackMessage),
    try: () =>
      auth.api.updateOrganization({
        body: input,
        headers,
      }),
  });

export const deleteAuthOrganization = (
  input: DeleteOrganizationInput,
  headers: Headers,
  organizationId: string
) =>
  Effect.tryPromise({
    catch: (cause) =>
      mapOrganizationAuthApiFailure(
        cause,
        `Unable to delete organization ${organizationId}.`
      ),
    try: () =>
      auth.api.deleteOrganization({
        body: input,
        headers,
      }),
  });
