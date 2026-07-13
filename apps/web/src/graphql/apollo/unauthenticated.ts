import type { ErrorLike } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

export function isUnauthenticatedError(error: ErrorLike): boolean {
  if (!CombinedGraphQLErrors.is(error)) {
    return false;
  }

  return error.errors.some(
    (graphQLError) =>
      graphQLError.extensions?.code === "UNAUTHENTICATED" ||
      graphQLError.message === "UNAUTHENTICATED"
  );
}
