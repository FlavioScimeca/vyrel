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

/** Client-facing GraphQL codes that should keep their real message in production. */
const PASSTHROUGH_ERROR_CODES = new Set([
  "BAD_USER_INPUT",
  "FORBIDDEN",
  "NOT_FOUND",
  "UNAUTHENTICATED",
  "SERVICE_UNAVAILABLE",
  "TASK_REPOSITORY",
  "ORGANIZATION_REPOSITORY",
  "USER_REPOSITORY",
]);

function extensionCode(error: GraphQLError): string | undefined {
  const { code } = error.extensions;
  return typeof code === "string" ? code : undefined;
}

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
    // graphql-js wraps thrown GraphQLErrors and sets originalError to the
    // resolver error (which still has the real message + extensions).
    if (error.originalError instanceof GraphQLError) {
      const inner = error.originalError;
      const innerCode = extensionCode(inner);
      if (
        isDev ||
        (innerCode !== undefined && PASSTHROUGH_ERROR_CODES.has(innerCode))
      ) {
        return inner;
      }
    }

    const code = extensionCode(error);
    if (isDev || (code !== undefined && PASSTHROUGH_ERROR_CODES.has(code))) {
      return error;
    }

    return new GraphQLError(message, { extensions: error.extensions });
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
