import { Effect } from "effect";

import {
  afterCreateAttachMedia,
  type WithMediaWarning,
} from "../../../lib/after-create-attach-media";
import { type UserTypeCreate, userCreateSchema } from "../types/base.types";
import { type UserError, UserValidationError } from "../utils/errors";
import { mergeSessionHeaders } from "../utils/session-headers";
import {
  type SignUpEmailResult,
  signUpEmail,
  updateAuthUser,
} from "./auth.service";
import { uploadUserAvatar } from "./avatar.service";

export type CreateUserResult = WithMediaWarning<SignUpEmailResult>;

export const createUser = (
  input: UserTypeCreate,
  requestHeaders: Headers
): Effect.Effect<CreateUserResult, UserError> =>
  Effect.gen(function* () {
    const safeValues = userCreateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new UserValidationError({
        issues: safeValues.error.issues,
        message: "Invalid sign-up values.",
      });
    }

    const { avatar, email, name, password } = safeValues.data;
    const signUp = yield* signUpEmail(
      {
        email,
        name,
        password,
      },
      requestHeaders
    );

    if (avatar === undefined) {
      return signUp satisfies CreateUserResult;
    }

    return yield* afterCreateAttachMedia(
      signUp,
      Effect.gen(function* () {
        const imageFields = yield* uploadUserAvatar(signUp.user.id, avatar);
        const sessionHeaders = mergeSessionHeaders(
          requestHeaders,
          signUp.setCookies
        );

        yield* updateAuthUser(
          imageFields,
          sessionHeaders,
          "Unable to save avatar."
        );

        return {
          setCookies: signUp.setCookies,
          token: signUp.token,
          user: {
            ...signUp.user,
            ...imageFields,
          },
        } satisfies SignUpEmailResult;
      })
    );
  });
