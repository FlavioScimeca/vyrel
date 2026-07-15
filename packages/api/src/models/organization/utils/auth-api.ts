import { db } from "@vyrel/db";
import { member, organization } from "@vyrel/db/schema";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { Data, Effect } from "effect";

import { fetchSessionUserId } from "../../user/utils/auth-api";
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
  Effect.tryPromise({
    catch: (cause) =>
      new OrganizationRepositoryError({
        cause,
        message: "Unable to verify organization membership.",
      }),
    try: () =>
      db
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            eq(member.organizationId, organizationId),
            eq(member.userId, userId)
          )
        )
        .get(),
  }).pipe(
    Effect.flatMap((record) => {
      if (record === undefined) {
        return Effect.fail(
          new OrganizationInaccessibleError({ id: organizationId })
        );
      }

      return Effect.succeed(undefined);
    })
  );

export const fetchOrganizationsForUser = (
  headers: Headers,
  jwtUserId?: string
) =>
  Effect.gen(function* () {
    const sessionUserId = yield* fetchSessionUserId(headers);
    const userId = sessionUserId ?? jwtUserId ?? null;
    if (userId === null) {
      return [];
    }

    const records = yield* Effect.tryPromise({
      catch: (cause) =>
        new OrganizationRepositoryError({
          cause,
          message: "Unable to load organizations.",
        }),
      try: () =>
        db
          .select({ organization })
          .from(organization)
          .innerJoin(member, eq(member.organizationId, organization.id))
          .where(eq(member.userId, userId))
          .all(),
    });

    return records.map((row) => row.organization);
  });

export const fetchOrganization = (
  id: string,
  headers: Headers,
  jwtUserId?: string
) =>
  Effect.gen(function* () {
    const sessionUserId = yield* fetchSessionUserId(headers);
    const userId = sessionUserId ?? jwtUserId ?? null;
    if (userId === null) {
      return null;
    }

    yield* assertOrganizationMember(id, userId);

    const record = yield* Effect.tryPromise({
      catch: (cause) =>
        new OrganizationRepositoryError({
          cause,
          message: "Unable to load organization.",
        }),
      try: () =>
        db.select().from(organization).where(eq(organization.id, id)).get(),
    });

    return record ?? null;
  }).pipe(
    Effect.catchTag("OrganizationInaccessibleError", () => Effect.succeed(null))
  );
