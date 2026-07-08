import { auth } from "@vyrel/auth";
import { Effect } from "effect";

import { type UserTypeUpdate, userUpdateSchema } from "../types/base.types";
import { fetchCurrentUser, mapAuthApiFailure } from "../utils/auth-api";
import { UserRepositoryError, UserValidationError } from "../utils/errors";

export const updateUser = (input: UserTypeUpdate, headers: Headers) =>
  Effect.gen(function* () {
    const safeValues = userUpdateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new UserValidationError({
        issues: safeValues.error.issues,
        message: "Invalid user update values.",
      });
    }

    const {
      name,
      imageThumb,
      imageFull,
      imagePlaceholder,
      imageAssetId,
      printifyToken,
    } = safeValues.data;
    const body: {
      name?: string;
      imageThumb?: string | null;
      imageFull?: string | null;
      imagePlaceholder?: string | null;
      imageAssetId?: string | null;
      printifyToken?: string;
    } = {};

    if (name !== undefined) {
      body.name = name;
    }
    if (imageThumb !== undefined) {
      body.imageThumb = imageThumb;
    }
    if (imageFull !== undefined) {
      body.imageFull = imageFull;
    }
    if (imagePlaceholder !== undefined) {
      body.imagePlaceholder = imagePlaceholder;
    }
    if (imageAssetId !== undefined) {
      body.imageAssetId = imageAssetId;
    }
    if (printifyToken !== undefined) {
      body.printifyToken = printifyToken;
    }

    yield* Effect.tryPromise({
      catch: (cause) => mapAuthApiFailure(cause, "Unable to update user."),
      try: () =>
        auth.api.updateUser({
          body,
          headers,
        }),
    });

    const record = yield* fetchCurrentUser(headers);
    if (record === null) {
      return yield* new UserRepositoryError({
        cause: null,
        message: "User was not updated.",
      });
    }

    return record;
  });
