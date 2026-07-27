import type { user } from "@vyrel/db/schema";
import { APIError } from "better-auth/api";
import { Data, Effect } from "effect";

import { UserRepository } from "../services/user.repository";
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

export function mapAuthApiFailure(
  cause: unknown,
  fallbackMessage: string
): UserForbiddenError | UserRepositoryError | UserValidationError {
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

export const fetchCurrentUser = (actorUserId: string) =>
  Effect.gen(function* () {
    const users = yield* UserRepository;
    const record = yield* users.findById(actorUserId);
    return record ?? null;
  });

export const fetchUser = (id: string, actorUserId: string) =>
  fetchCurrentUser(actorUserId).pipe(
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
