import { createGraphqlRunner } from "@vyrel/graphql/effect/create-graphql-runner";
import { log } from "@vyrel/logging";

import type { UserServices } from "../services/user.layer";
import { UserRuntime } from "../services/user.layer";

export const runUserGraphqlEffect = createGraphqlRunner<UserServices>({
  domain: "user",
  errorMap: {
    UserForbiddenError: { code: "FORBIDDEN", status: 403 },
    UserMediaError: { code: "BAD_USER_INPUT", status: 400 },
    UserNotFoundError: {
      code: "NOT_FOUND",
      message: (error) => error.message ?? `User ${error.id} was not found.`,
      status: 404,
    },
    UserRepositoryError: { code: "USER_REPOSITORY", status: 503 },
    UserValidationError: {
      code: "BAD_USER_INPUT",
      extras: (error) =>
        error.issues === undefined ? undefined : { issues: error.issues },
      status: 400,
    },
  },
  log,
  runtime: UserRuntime,
});
