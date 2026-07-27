import { createHttpRunner } from "@vyrel/graphql/effect/create-http-runner";
import { log } from "@vyrel/logging";
import type { Effect } from "effect";

import type { CreateUserResult } from "../services/create.service";
import type { UserServices } from "../services/user.layer";
import { UserRuntime } from "../services/user.layer";
import type { UserError } from "../utils/errors";

// biome-ignore lint/performance/noBarrelFile: _
export { HttpBoundaryError as UserHttpError } from "@vyrel/graphql/effect/create-http-runner";

const runUserHttpEffect = createHttpRunner<UserServices>({
  domain: "user",
  errorMap: {
    UserForbiddenError: {
      body: (error) => ({ message: error.message }),
      status: 403,
    },
    UserMediaError: {
      body: (error) => ({ message: error.message }),
      status: 400,
    },
    UserNotFoundError: {
      body: (error) => ({
        message: error.message ?? `User ${error.id} was not found.`,
      }),
      status: 404,
    },
    UserRepositoryError: {
      body: (error) => ({ message: error.message }),
      status: 503,
    },
    UserValidationError: {
      body: (error) => ({
        issues: error.issues,
        message: error.message,
      }),
      status: 400,
    },
  },
  log,
  runtime: UserRuntime,
});

export function runUserCreateEffect(
  effect: Effect.Effect<CreateUserResult, UserError, UserServices>
): Promise<CreateUserResult> {
  return runUserHttpEffect(effect, { operation: "createUser" });
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
    ...(result.mediaWarning === undefined
      ? {}
      : { mediaWarning: result.mediaWarning }),
  };
}
