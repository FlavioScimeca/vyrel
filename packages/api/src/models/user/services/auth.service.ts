import { auth } from "@vyrel/auth";
import { APIError } from "better-auth/api";
import { Effect } from "effect";

import { mapAuthApiFailure } from "../utils/auth-api";
import { UserRepositoryError, UserValidationError } from "../utils/errors";
import { readSetCookieHeaders } from "../utils/session-headers";

export type AuthUserProfile = {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  imageAssetId: string | null;
  imageFull: string | null;
  imagePlaceholder: string | null;
  imageThumb: string | null;
  name: string;
  updatedAt: Date;
};

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

type SignUpResponseBody = {
  token: string | null;
  user: AuthUserProfile;
};

function sanitizeUser(value: SignUpResponseBody["user"]): AuthUserProfile {
  return {
    createdAt: value.createdAt,
    email: value.email,
    emailVerified: value.emailVerified,
    id: value.id,
    imageAssetId: value.imageAssetId ?? null,
    imageFull: value.imageFull ?? null,
    imagePlaceholder: value.imagePlaceholder ?? null,
    imageThumb: value.imageThumb ?? null,
    name: value.name,
    updatedAt: value.updatedAt,
  };
}

function mapSignUpFailure(cause: unknown): UserValidationError {
  if (cause instanceof APIError) {
    return new UserValidationError({
      cause,
      message: cause.message ?? "Unable to create account.",
    });
  }

  return new UserValidationError({
    cause,
    message: "Unable to create account.",
  });
}

export const signUpEmail = (
  input: SignUpEmailInput,
  headers: Headers
): Effect.Effect<
  SignUpEmailResult,
  UserRepositoryError | UserValidationError
> =>
  Effect.gen(function* () {
    const signUpResponse = yield* Effect.tryPromise({
      catch: (cause) => mapSignUpFailure(cause),
      try: () =>
        auth.api.signUpEmail({
          asResponse: true,
          body: input,
          headers,
        }),
    });

    const signUpBody = (yield* Effect.tryPromise({
      catch: (cause) =>
        new UserRepositoryError({
          cause,
          message: "Sign-up succeeded but the response was invalid.",
        }),
      try: () =>
        signUpResponse.json() as Promise<
          SignUpResponseBody | { message?: string }
        >,
    })) as SignUpResponseBody | { message?: string };

    if (!signUpResponse.ok) {
      return yield* new UserValidationError({
        message:
          "message" in signUpBody && typeof signUpBody.message === "string"
            ? signUpBody.message
            : "Unable to create account.",
      });
    }

    const signUpPayload = signUpBody as SignUpResponseBody;

    return {
      setCookies: readSetCookieHeaders(signUpResponse),
      token: signUpPayload.token,
      user: sanitizeUser(signUpPayload.user),
    };
  });

export const updateAuthUser = (
  body: UpdateAuthUserBody,
  headers: Headers,
  fallbackMessage = "Unable to update user."
) =>
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
) =>
  Effect.tryPromise({
    catch: (cause) =>
      mapAuthApiFailure(cause, `Unable to delete user ${userId}.`),
    try: () =>
      auth.api.deleteUser({
        body: input,
        headers,
      }),
  });
