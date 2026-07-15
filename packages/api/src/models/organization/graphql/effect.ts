import { toGraphQLError } from "@vyrel/graphql/utils/to-graphql-error";
import { Cause, Effect, Exit } from "effect";
import type { GraphQLError } from "graphql";

import type { OrganizationServices } from "../services/organization.layer";
import { OrganizationRuntime } from "../services/organization.layer";
import type { OrganizationError } from "../utils/errors";

const mapOrganizationErrorsToGraphQL = <A>(
  effect: Effect.Effect<
    A,
    OrganizationError | GraphQLError,
    OrganizationServices
  >
): Effect.Effect<A, GraphQLError, OrganizationServices> =>
  effect.pipe(
    Effect.catchTags({
      OrganizationForbiddenError: (error) =>
        Effect.fail(toGraphQLError(error.message, "FORBIDDEN", 403)),
      OrganizationMediaError: (error) =>
        Effect.fail(toGraphQLError(error.message, "BAD_USER_INPUT", 400)),
      OrganizationNotFoundError: (error) =>
        Effect.fail(
          toGraphQLError(
            error.message ?? `Organization ${error.id} was not found.`,
            "NOT_FOUND",
            404
          )
        ),
      OrganizationRepositoryError: (error) =>
        Effect.fail(
          toGraphQLError(error.message, "ORGANIZATION_REPOSITORY", 503)
        ),
      OrganizationValidationError: (error) =>
        Effect.fail(
          toGraphQLError(error.message, "BAD_USER_INPUT", 400, {
            issues: error.issues,
          })
        ),
    })
  );

export function runOrganizationGraphqlEffect<A>(
  effect: Effect.Effect<
    A,
    OrganizationError | GraphQLError,
    OrganizationServices
  >
): Promise<A> {
  return OrganizationRuntime.runPromiseExit(
    mapOrganizationErrorsToGraphQL(effect)
  ).then((exit) =>
    Exit.match(exit, {
      onFailure: (cause) => {
        throw Cause.squash(cause);
      },
      onSuccess: (value) => value,
    })
  );
}
