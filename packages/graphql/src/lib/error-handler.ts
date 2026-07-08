import { GraphQLError } from "graphql";
import {
  type AppError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthenticatedError,
} from "./domain-errors";

const domainErrorMap = new Map<
  new (
    message?: string
  ) => AppError,
  { code: string; status: number }
>([
  [UnauthenticatedError, { code: "UNAUTHENTICATED", status: 401 }],
  [ForbiddenError, { code: "FORBIDDEN", status: 403 }],
  [NotFoundError, { code: "NOT_FOUND", status: 404 }],
  [ServiceUnavailableError, { code: "SERVICE_UNAVAILABLE", status: 503 }],
]);

export function formatError(
  error: unknown,
  message: string,
  isDev: boolean
): GraphQLError {
  if (error instanceof GraphQLError && error.originalError === undefined) {
    return error;
  }

  const original = error instanceof GraphQLError ? error.originalError : error;

  for (const [ErrorClass, { code, status }] of domainErrorMap) {
    if (original instanceof ErrorClass) {
      return new GraphQLError(original.message, {
        extensions: { code, http: { status } },
      });
    }
  }

  if (error instanceof GraphQLError) {
    return isDev
      ? error
      : new GraphQLError(message, { extensions: error.extensions });
  }

  if (isDev && error instanceof Error) {
    return new GraphQLError(error.message, {
      extensions: { code: "INTERNAL_SERVER_ERROR", http: { status: 500 } },
    });
  }

  return new GraphQLError(message, {
    extensions: { code: "INTERNAL_SERVER_ERROR", http: { status: 500 } },
  });
}
