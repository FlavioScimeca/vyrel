import type { ErrorLike } from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";

export function isUnauthenticatedError(error: ErrorLike): boolean {
  if (ServerError.is(error)) {
    return error.statusCode === 401;
  }

  if (!CombinedGraphQLErrors.is(error)) {
    return false;
  }

  return error.errors.some(
    (graphQLError) =>
      graphQLError.extensions?.code === "UNAUTHENTICATED" ||
      graphQLError.message === "UNAUTHENTICATED"
  );
}
