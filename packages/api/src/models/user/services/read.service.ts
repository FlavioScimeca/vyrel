import { db } from "@vyrel/db";
import { user } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import type { UserTypeById } from "../types/extra.types";
import { fetchSessionUserId, fetchUser } from "../utils/auth-api";
import { UserRepositoryError } from "../utils/errors";

export const getUser = (
  input: UserTypeById,
  headers: Headers,
  jwtUserId?: string
) => fetchUser(input.id, headers, jwtUserId);

/** Loads the user for the session cookie (or verified JWT fallback) from the database. */
export const getCurrentUser = (headers: Headers, jwtUserId?: string) =>
  Effect.gen(function* () {
    const sessionUserId = yield* fetchSessionUserId(headers);
    const userId = sessionUserId ?? jwtUserId ?? null;
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
