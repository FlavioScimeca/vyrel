import { APIError } from "better-auth/api";
import { Data, Effect } from "effect";

import { OrganizationRepository } from "../services/organization.repository";
import {
  OrganizationForbiddenError,
  OrganizationRepositoryError,
  OrganizationValidationError,
} from "./errors";

class OrganizationInaccessibleError extends Data.TaggedError(
  "OrganizationInaccessibleError"
)<{
  readonly id: string;
}> {}

export function mapOrganizationAuthApiFailure(
  cause: unknown,
  fallbackMessage: string
) {
  if (cause instanceof APIError) {
    if (cause.status === "FORBIDDEN" || cause.status === "UNAUTHORIZED") {
      return new OrganizationForbiddenError({
        message: cause.message ?? fallbackMessage,
      });
    }

    return new OrganizationValidationError({
      cause,
      message: cause.message ?? fallbackMessage,
    });
  }

  return new OrganizationRepositoryError({
    cause,
    message: fallbackMessage,
  });
}

export const assertOrganizationMember = (
  organizationId: string,
  userId: string
) =>
  Effect.gen(function* () {
    const organizations = yield* OrganizationRepository;
    const record = yield* organizations.findMembership(organizationId, userId);

    if (record === undefined) {
      return yield* new OrganizationInaccessibleError({ id: organizationId });
    }
  });

export const fetchOrganizationsForUser = (actorUserId: string) =>
  Effect.gen(function* () {
    const organizations = yield* OrganizationRepository;
    return yield* organizations.listForUser(actorUserId);
  });

export const fetchOrganization = (id: string, actorUserId: string) =>
  Effect.gen(function* () {
    yield* assertOrganizationMember(id, actorUserId);

    const organizations = yield* OrganizationRepository;
    const record = yield* organizations.findById(id);

    return record ?? null;
  }).pipe(
    Effect.catchTag("OrganizationInaccessibleError", () => Effect.succeed(null))
  );
