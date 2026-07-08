import { toGraphQLError } from "@vyrel/graphql/utils/to-graphql-error";
import { Cause, Effect, Exit } from "effect";
import type { GraphQLError } from "graphql";
import type { UserServices } from "../services/user.layer";
import { UserRuntime } from "../services/user.layer";
import type { UserError } from "../utils/errors";

const mapUserErrorsToGraphQL = <A>(
  effect: Effect.Effect<A, UserError | GraphQLError, UserServices>
): Effect.Effect<A, GraphQLError, UserServices> =>
  effect.pipe(
    Effect.catchTags({
      UserForbiddenError: (error) =>
        Effect.fail(toGraphQLError(error.message, "FORBIDDEN", 403)),
      UserMediaError: (error) =>
        Effect.fail(toGraphQLError(error.message, "BAD_USER_INPUT", 400)),
      UserNotFoundError: (error) =>
        Effect.fail(
          toGraphQLError(
            error.message ?? `User ${error.id} was not found.`,
            "NOT_FOUND",
            404
          )
        ),
      UserRepositoryError: (error) =>
        Effect.fail(toGraphQLError(error.message, "USER_REPOSITORY", 503)),
      UserValidationError: (error) =>
        Effect.fail(
          toGraphQLError(error.message, "BAD_USER_INPUT", 400, {
            issues: error.issues,
          })
        ),
    })
  );

export function runUserGraphqlEffect<A>(
  effect: Effect.Effect<A, UserError | GraphQLError, UserServices>
): Promise<A> {
  return UserRuntime.runPromiseExit(mapUserErrorsToGraphQL(effect)).then(
    (exit) =>
      Exit.match(exit, {
        onFailure: (cause) => {
          throw Cause.squash(cause);
        },
        onSuccess: (value) => value,
      })
  );
}
