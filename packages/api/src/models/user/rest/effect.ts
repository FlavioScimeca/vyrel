import { Cause, Data, Effect, Exit } from "effect";

import type { CreateUserResult } from "../services/create.service";
import type { UserError } from "../utils/errors";

export class UserHttpError extends Data.TaggedError("UserHttpError")<{
  readonly status: number;
  readonly body: Record<string, unknown>;
}> {}

function userHttpError(
  status: number,
  body: Record<string, unknown>
): UserHttpError {
  return new UserHttpError({ body, status });
}

const mapUserErrorsToHttp = <A>(
  effect: Effect.Effect<A, UserError>
): Effect.Effect<A, UserHttpError> =>
  effect.pipe(
    Effect.catchTags({
      UserForbiddenError: (error) =>
        Effect.fail(
          userHttpError(403, {
            message: error.message,
          })
        ),
      UserMediaError: (error) =>
        Effect.fail(
          userHttpError(400, {
            message: error.message,
          })
        ),
      UserNotFoundError: (error) =>
        Effect.fail(
          userHttpError(404, {
            message: error.message ?? `User ${error.id} was not found.`,
          })
        ),
      UserRepositoryError: (error) =>
        Effect.fail(
          userHttpError(503, {
            message: error.message,
          })
        ),
      UserValidationError: (error) =>
        Effect.fail(
          userHttpError(400, {
            issues: error.issues,
            message: error.message,
          })
        ),
    })
  );

export function runUserCreateEffect(
  effect: Effect.Effect<CreateUserResult, UserError>
): Promise<CreateUserResult> {
  return Effect.runPromiseExit(mapUserErrorsToHttp(effect)).then((exit) =>
    Exit.match(exit, {
      onFailure: (cause) => {
        throw Cause.squash(cause);
      },
      onSuccess: (value) => value,
    })
  );
}

type UserCreateSetContext = {
  headers: {
    [key: string]: string | number | string[] | undefined;
  };
  status?: number | string;
};

export function finishUserCreate(
  set: UserCreateSetContext,
  result: CreateUserResult
) {
  set.status = 201;

  if (result.setCookies.length === 1) {
    set.headers["set-cookie"] = result.setCookies[0];
  } else if (result.setCookies.length > 1) {
    set.headers["set-cookie"] = [...result.setCookies];
  }

  return {
    token: result.token,
    user: result.user,
  };
}
