import { auth } from "@vyrel/auth";
import { userAvatarObjectKeys } from "@vyrel/storage/keys";
import { uploadObject } from "@vyrel/storage/object-storage";
import { APIError } from "better-auth/api";
import { Effect } from "effect";

import {
  encodeImagePlaceholder,
  type ImageOptimizeError,
  messageForImageOptimizeError,
} from "../../../lib/media/image-optimizer";
import { optimizeUserAvatarImages } from "../../../lib/media/user-avatar-optimizer";
import { type UserTypeCreate, userCreateSchema } from "../types/base.types";
import { mapAuthApiFailure } from "../utils/auth-api";
import {
  UserMediaError,
  UserRepositoryError,
  UserValidationError,
} from "../utils/errors";
import {
  mergeSessionHeaders,
  readSetCookieHeaders,
} from "../utils/session-headers";
import { validateUserAvatarFile } from "../utils/validate-user-avatar";

export type CreateUserResult = {
  readonly setCookies: string[];
  readonly token: string | null;
  readonly user: {
    readonly createdAt: Date;
    readonly email: string;
    readonly emailVerified: boolean;
    readonly id: string;
    readonly imageAssetId: string | null;
    readonly imageFull: string | null;
    readonly imagePlaceholder: string | null;
    readonly imageThumb: string | null;
    readonly name: string;
    readonly updatedAt: Date;
  };
};

type SignUpResponseBody = {
  readonly token: string | null;
  readonly user: CreateUserResult["user"] & {
    readonly printifyToken?: string;
  };
};

function sanitizeUser(
  value: SignUpResponseBody["user"]
): CreateUserResult["user"] {
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

const uploadUserAvatar = (userId: string, avatar: File) =>
  Effect.gen(function* () {
    const validation = yield* Effect.tryPromise({
      catch: (cause) =>
        new UserMediaError({
          cause,
          message: "Unable to read the avatar image.",
        }),
      try: () => validateUserAvatarFile(avatar),
    });

    if (!validation.ok) {
      return yield* new UserValidationError({
        message: validation.message,
      });
    }

    const keys = userAvatarObjectKeys(userId);
    const previews = yield* optimizeUserAvatarImages(
      validation.file.buffer
    ).pipe(
      Effect.mapError(
        (error: ImageOptimizeError) =>
          new UserMediaError({
            cause: error,
            message: messageForImageOptimizeError(error),
          })
      )
    );
    const imagePlaceholder = yield* encodeImagePlaceholder(
      validation.file.buffer
    ).pipe(
      Effect.mapError(
        (error: ImageOptimizeError) =>
          new UserMediaError({
            cause: error,
            message: messageForImageOptimizeError(error),
          })
      )
    );

    yield* Effect.all(
      [
        uploadObject(keys.thumbKey, previews.thumb.buffer, {
          contentType: previews.thumb.contentType,
        }),
        uploadObject(keys.fullKey, previews.full.buffer, {
          contentType: previews.full.contentType,
        }),
      ],
      { concurrency: 2 }
    ).pipe(
      Effect.mapError(
        (error) =>
          new UserMediaError({
            cause: error,
            message: "Unable to store avatar in object storage.",
          })
      )
    );

    return {
      imageAssetId: userId,
      imageFull: keys.fullKey,
      imagePlaceholder,
      imageThumb: keys.thumbKey,
    };
  });

export const createUser = (input: UserTypeCreate, requestHeaders: Headers) =>
  Effect.gen(function* () {
    const safeValues = userCreateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new UserValidationError({
        issues: safeValues.error.issues,
        message: "Invalid sign-up values.",
      });
    }

    const { avatar, callbackURL, email, name, password } = safeValues.data;

    const signUpResponse = yield* Effect.tryPromise({
      catch: (cause) => mapSignUpFailure(cause),
      try: () =>
        auth.api.signUpEmail({
          asResponse: true,
          body: {
            callbackURL,
            email,
            name,
            password,
          },
          headers: requestHeaders,
        }),
    });

    const signUpSetCookies = readSetCookieHeaders(signUpResponse);
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
    let currentUser = sanitizeUser(signUpPayload.user);

    if (avatar !== undefined) {
      const imageFields = yield* uploadUserAvatar(currentUser.id, avatar);
      const sessionHeaders = mergeSessionHeaders(
        requestHeaders,
        signUpSetCookies
      );

      yield* Effect.tryPromise({
        catch: (cause) => mapAuthApiFailure(cause, "Unable to save avatar."),
        try: () =>
          auth.api.updateUser({
            body: imageFields,
            headers: sessionHeaders,
          }),
      });

      currentUser = {
        ...currentUser,
        ...imageFields,
      };
    }

    return {
      setCookies: signUpSetCookies,
      token: signUpPayload.token,
      user: currentUser,
    } satisfies CreateUserResult;
  });
