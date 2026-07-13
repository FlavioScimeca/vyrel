import { Effect } from "effect";

import { type UserTypeUpdate, userUpdateSchema } from "../types/base.types";
import { fetchCurrentUser } from "../utils/auth-api";
import { UserRepositoryError, UserValidationError } from "../utils/errors";
import { type UpdateAuthUserBody, updateAuthUser } from "./auth.service";

export const updateUser = (
  input: UserTypeUpdate,
  headers: Headers,
  jwtUserId?: string
) =>
  Effect.gen(function* () {
    const safeValues = userUpdateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new UserValidationError({
        issues: safeValues.error.issues,
        message: "Invalid user update values.",
      });
    }

    const { name } = safeValues.data;
    const body: UpdateAuthUserBody = {};

    if (name !== undefined) {
      body.name = name;
    }

    yield* updateAuthUser(body, headers);

    const record = yield* fetchCurrentUser(headers, jwtUserId);
    if (record === null) {
      return yield* new UserRepositoryError({
        cause: null,
        message: "User was not updated.",
      });
    }

    return record;
  });
