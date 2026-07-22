import { db } from "@vyrel/db";
import { user } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import type { UserTypeById } from "../types/extra.types";
import { fetchUser, resolveAuthenticatedUserId } from "../utils/auth-api";
import { UserRepositoryError } from "../utils/errors";

export const getUser = (
  input: UserTypeById,
  headers: Headers,
  actorUserId?: string | null
) => fetchUser(input.id, headers, actorUserId);

/** Loads the user for an already-resolved actor, or resolves a session fallback. */
export const getCurrentUser = (headers: Headers, actorUserId?: string | null) =>
  Effect.gen(function* () {
    const userId = yield* resolveAuthenticatedUserId(headers, actorUserId);
    if (userId === null) {
      return null;
    }

    const record = yield* Effect.tryPromise({
      catch: (cause) =>
        new UserRepositoryError({
          cause,
          message: "Unable to load current user.",
        }),
      try: () => db.select().from(user).where(eq(user.id, userId)).get(),
    });

    return record ?? null;
  });
