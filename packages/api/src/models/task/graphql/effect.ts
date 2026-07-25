import { toGraphQLError } from "@vyrel/graphql/utils/to-graphql-error";
import { log } from "@vyrel/logging";
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
  effect: Effect.Effect<A, TaskError | GraphQLError, TaskServices>,
  options?: { mutation?: string }
): Promise<A> {
  return TaskRuntime.runPromiseExit(mapTaskErrorsToGraphQL(effect)).then(
    (exit) =>
      Exit.match(exit, {
        onFailure: (cause) => {
          const error = Cause.squash(cause);
          const graphqlError = error as {
            extensions?: { code?: string };
            message?: string;
          };
          const code = graphqlError.extensions?.code;
          if (options?.mutation !== undefined) {
            log.error({
              code,
              error: graphqlError.message ?? "Unknown task mutation failure",
              event: "task.mutation.failed",
              operation: options.mutation,
            });
          } else if (code === "FORBIDDEN") {
            log.warn({
              event: "task.authorization.denied",
            });
          }
          throw error;
        },
        onSuccess: (value) => value,
      })
  );
}
