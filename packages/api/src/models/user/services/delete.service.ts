import { Effect } from "effect";

import { type UserTypeDelete, userDeleteSchema } from "../types/base.types";
import { fetchCurrentUser } from "../utils/auth-api";
import { UserRepositoryError, UserValidationError } from "../utils/errors";
import { deleteAuthUser } from "./auth.service";

export const deleteUser = (
  input: UserTypeDelete,
  headers: Headers,
  actorUserId: string
) =>
  Effect.gen(function* () {
    const safeValues = userDeleteSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new UserValidationError({
        issues: safeValues.error.issues,
        message: "Invalid user delete request.",
      });
    }

    const currentUser = yield* fetchCurrentUser(actorUserId);
    if (currentUser === null) {
      return yield* new UserRepositoryError({
        cause: null,
        message: "Unable to delete user without an active session.",
      });
    }

    const { password, callbackURL, token } = safeValues.data;

    yield* deleteAuthUser(
      { callbackURL, password, token },
      headers,
      currentUser.id
    );

    return currentUser.id;
  });
