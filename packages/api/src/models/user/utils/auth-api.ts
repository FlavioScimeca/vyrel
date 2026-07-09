import { auth } from "@vyrel/auth";
import { db } from "@vyrel/db";
import type { user } from "@vyrel/db/schema";
import { user as userTable } from "@vyrel/db/schema";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";

import {
  UserForbiddenError,
  UserRepositoryError,
  UserValidationError,
} from "./errors";

class UserInaccessibleError extends Data.TaggedError("UserInaccessibleError")<{
  readonly id: string;
}> {}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  imageThumb?: string | null;
  imageFull?: string | null;
  imagePlaceholder?: string | null;
  imageAssetId?: string | null;
  printifyToken: string;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeUserRecord(
  authUser: AuthUser
): typeof user.$inferSelect {
  return {
    createdAt: authUser.createdAt,
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    id: authUser.id,
    imageAssetId: authUser.imageAssetId ?? null,
    imageFull: authUser.imageFull ?? null,
    imagePlaceholder: authUser.imagePlaceholder ?? null,
    imageThumb: authUser.imageThumb ?? null,
    name: authUser.name,
    updatedAt: authUser.updatedAt,
  };
}

export function mapAuthApiFailure(cause: unknown, fallbackMessage: string) {
  if (cause instanceof APIError) {
    if (cause.status === "FORBIDDEN" || cause.status === "UNAUTHORIZED") {
      return new UserForbiddenError({
        message: cause.message ?? fallbackMessage,
      });
    }

    return new UserValidationError({
      cause,
      message: cause.message ?? fallbackMessage,
    });
  }

  return new UserRepositoryError({
    cause,
    message: fallbackMessage,
  });
}

/** Resolves the authenticated user id from the Better Auth session cookie. */
export const fetchSessionUserId = (
  headers: Headers
): Effect.Effect<string | null> =>
  Effect.tryPromise({
    catch: (cause) =>
      new UserRepositoryError({
        cause,
        message: "Unable to load session.",
      }),
    try: () => auth.api.getSession({ headers }),
  }).pipe(
    Effect.map((session) => session?.user?.id ?? null),
    Effect.catchTag("UserRepositoryError", () => Effect.succeed(null))
  );

export const fetchCurrentUser = (headers: Headers) =>
  Effect.gen(function* () {
    const userId = yield* fetchSessionUserId(headers);
    if (userId === null) {
      return null;
    }

    const record = yield* Effect.tryPromise({
      catch: (cause) =>
        new UserRepositoryError({
          cause,
          message: "Unable to load current user.",
        }),
      try: () =>
        db.select().from(userTable).where(eq(userTable.id, userId)).get(),
    });

    return record ?? null;
  });

export const fetchUser = (id: string, headers: Headers) =>
  fetchCurrentUser(headers).pipe(
    Effect.flatMap((currentUser) => {
      if (currentUser === null) {
        return Effect.succeed(null);
      }

      if (currentUser.id !== id) {
        return Effect.fail(new UserInaccessibleError({ id }));
      }

      return Effect.succeed(currentUser);
    }),
    Effect.catchTag("UserInaccessibleError", () => Effect.succeed(null))
  );
