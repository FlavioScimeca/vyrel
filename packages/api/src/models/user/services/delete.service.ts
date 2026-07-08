import { auth } from "@vyrel/auth";
import { Effect } from "effect";

import { type UserTypeDelete, userDeleteSchema } from "../types/base.types";
import { fetchCurrentUser, mapAuthApiFailure } from "../utils/auth-api";
import { UserRepositoryError, UserValidationError } from "../utils/errors";

export const deleteUser = (input: UserTypeDelete, headers: Headers) =>
  Effect.gen(function* () {
    const safeValues = userDeleteSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new UserValidationError({
        issues: safeValues.error.issues,
        message: "Invalid user delete request.",
      });
    }

    const currentUser = yield* fetchCurrentUser(headers);
    if (currentUser === null) {
      return yield* new UserRepositoryError({
        cause: null,
        message: "Unable to delete user without an active session.",
      });
    }

    const { password, callbackURL, token } = safeValues.data;

    yield* Effect.tryPromise({
      catch: (cause) =>
        mapAuthApiFailure(cause, `Unable to delete user ${currentUser.id}.`),
      try: () =>
        auth.api.deleteUser({
          body: {
            callbackURL,
            password,
            token,
          },
          headers,
        }),
    });

    return currentUser.id;
  });
