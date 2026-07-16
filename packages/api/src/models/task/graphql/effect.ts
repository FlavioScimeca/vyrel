import { toGraphQLError } from "@vyrel/graphql/utils/to-graphql-error";
import { Cause, Effect, Exit } from "effect";
import type { GraphQLError } from "graphql";

import type { TaskServices } from "../services/task.layer";
import { TaskRuntime } from "../services/task.layer";
import type { TaskError } from "../utils/errors";

const mapTaskErrorsToGraphQL = <A>(
  effect: Effect.Effect<A, TaskError | GraphQLError, TaskServices>
): Effect.Effect<A, GraphQLError, TaskServices> =>
  effect.pipe(
    Effect.catchTags({
      TaskForbiddenError: (error) =>
        Effect.fail(toGraphQLError(error.message, "FORBIDDEN", 403)),
      TaskMediaError: (error) =>
        Effect.fail(toGraphQLError(error.message, "BAD_USER_INPUT", 400)),
      TaskNotFoundError: (error) =>
        Effect.fail(
          toGraphQLError(
            error.message ?? `Task ${error.id} was not found.`,
            "NOT_FOUND",
            404
          )
        ),
      TaskRepositoryError: (error) =>
        Effect.fail(toGraphQLError(error.message, "TASK_REPOSITORY", 503)),
      TaskValidationError: (error) =>
        Effect.fail(
          toGraphQLError(error.message, "BAD_USER_INPUT", 400, {
            issues: error.issues,
          })
        ),
    })
  );

export function runTaskGraphqlEffect<A>(
  effect: Effect.Effect<A, TaskError | GraphQLError, TaskServices>
): Promise<A> {
  return TaskRuntime.runPromiseExit(mapTaskErrorsToGraphQL(effect)).then(
    (exit) =>
      Exit.match(exit, {
        onFailure: (cause) => {
          throw Cause.squash(cause);
        },
        onSuccess: (value) => value,
      })
  );
}
