import { createGraphqlRunner } from "@vyrel/graphql/effect/create-graphql-runner";
import { log } from "@vyrel/logging";

import type { TaskServices } from "../services/task.layer";
import { TaskRuntime } from "../services/task.layer";

export const runTaskGraphqlEffect = createGraphqlRunner<TaskServices>({
  domain: "task",
  errorMap: {
    TaskForbiddenError: { code: "FORBIDDEN", status: 403 },
    TaskMediaError: { code: "BAD_USER_INPUT", status: 400 },
    TaskNotFoundError: {
      code: "NOT_FOUND",
      message: (error) => error.message ?? `Task ${error.id} was not found.`,
      status: 404,
    },
    TaskRepositoryError: { code: "TASK_REPOSITORY", status: 503 },
    TaskValidationError: {
      code: "BAD_USER_INPUT",
      extras: (error) =>
        error.issues === undefined ? undefined : { issues: error.issues },
      status: 400,
    },
  },
  log,
  runtime: TaskRuntime,
});
