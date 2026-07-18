import { auth } from "@vyrel/auth";
import { Effect } from "effect";
import z from "zod/v4";

import {
  type AuthUserProfile,
  authUserProfileSchema,
} from "../types/base.types";
import { mapAuthApiFailure } from "../utils/auth-api";
import {
  type UserForbiddenError,
  UserRepositoryError,
  UserValidationError,
} from "../utils/errors";
import { readResponseJson } from "../utils/response-json";
import { readSetCookieHeaders } from "../utils/session-headers";

export type SignUpEmailInput = {
  callbackURL?: string;
  email: string;
  name: string;
  password: string;
};

export type SignUpEmailResult = {
  setCookies: string[];
  token: string | null;
  user: AuthUserProfile;
};

export type UpdateAuthUserBody = {
  imageAssetId?: string | null;
  imageFull?: string | null;
  imagePlaceholder?: string | null;
  imageThumb?: string | null;
  name?: string;
};

export type DeleteAuthUserInput = {
  callbackURL?: string;
  password?: string;
  token?: string;
};

const signUpSuccessSchema = z.object({
  token: z.string().nullable(),
  user: authUserProfileSchema,
});

const signUpErrorSchema = z.object({
  message: z.string().optional(),
});

const invalidSignUpResponse = (cause: unknown) =>
  new UserRepositoryError({
    cause,
    message: "Sign-up succeeded but the response was invalid.",
  });

const decodeSignUpResponse = (
  response: Response,
  body: unknown
): Effect.Effect<
  SignUpEmailResult,
  UserRepositoryError | UserValidationError
> => {
  if (!response.ok) {
    const parsed = signUpErrorSchema.safeParse(body);
    return Effect.fail(
      new UserValidationError({
        message: parsed.success
          ? (parsed.data.message ?? "Unable to create account.")
          : "Unable to create account.",
      })
    );
  }

  const parsed = signUpSuccessSchema.safeParse(body);
  if (!parsed.success) {
    return Effect.fail(invalidSignUpResponse(parsed.error));
  }

  return Effect.succeed({
    setCookies: readSetCookieHeaders(response),
    token: parsed.data.token,
    user: parsed.data.user,
  });
};

export const signUpEmail = (
  input: SignUpEmailInput,
  headers: Headers
): Effect.Effect<
  SignUpEmailResult,
  UserForbiddenError | UserRepositoryError | UserValidationError
> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      catch: (cause) => mapAuthApiFailure(cause, "Unable to create account."),
      try: () =>
        auth.api.signUpEmail({
          asResponse: true,
          body: input,
          headers,
        }),
    });

    const body = yield* readResponseJson(response, invalidSignUpResponse);
    return yield* decodeSignUpResponse(response, body);
  });

export const updateAuthUser = (
  body: UpdateAuthUserBody,
  headers: Headers,
  fallbackMessage = "Unable to update user."
): Effect.Effect<
  Awaited<ReturnType<typeof auth.api.updateUser>>,
  UserForbiddenError | UserRepositoryError | UserValidationError
> =>
  Effect.tryPromise({
    catch: (cause) => mapAuthApiFailure(cause, fallbackMessage),
    try: () =>
      auth.api.updateUser({
        body,
        headers,
      }),
  });

export const deleteAuthUser = (
  input: DeleteAuthUserInput,
  headers: Headers,
  userId: string
): Effect.Effect<
  Awaited<ReturnType<typeof auth.api.deleteUser>>,
  UserForbiddenError | UserRepositoryError | UserValidationError
> =>
  Effect.tryPromise({
    catch: (cause) =>
      mapAuthApiFailure(cause, `Unable to delete user ${userId}.`),
    try: () =>
      auth.api.deleteUser({
        body: input,
        headers,
      }),
  });
