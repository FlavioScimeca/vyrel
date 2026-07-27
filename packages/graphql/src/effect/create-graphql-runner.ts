import { Cause, Effect, Exit, type ManagedRuntime } from "effect";
import { GraphQLError } from "graphql";

import { UnauthenticatedError } from "../lib/domain-errors";
import { toGraphQLError } from "../utils/to-graphql-error";

export type GraphqlErrorMapping = {
  code: string;
  message?: (error: {
    message?: string;
    id?: string;
    issues?: unknown;
  }) => string;
  status: number;
  extras?: (error: { issues?: unknown }) => Record<string, unknown> | undefined;
};

export type GraphqlRunnerOptions = {
  kind?: "mutation" | "query";
  operation?: string;
};

type LoggerLike = {
  error: (payload: Record<string, unknown>) => void;
  warn: (payload: Record<string, unknown>) => void;
};

export type CreateGraphqlRunnerConfig<R> = {
  domain: string;
  errorMap: Record<string, GraphqlErrorMapping>;
  log?: LoggerLike;
  runtime: ManagedRuntime.ManagedRuntime<R, never>;
};

function isZodError(
  error: unknown
): error is { issues: unknown[]; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ZodError" &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  );
}

function mapTaggedError(
  tag: string,
  error: { message?: string; id?: string; issues?: unknown },
  errorMap: Record<string, GraphqlErrorMapping>
): GraphQLError | null {
  const mapping = errorMap[tag];
  if (mapping === undefined) {
    return null;
  }

  const message =
    mapping.message?.(error) ?? error.message ?? "Request failed.";
  const extras = mapping.extras?.(error);

  return toGraphQLError(message, mapping.code, mapping.status, extras);
}

function logGraphqlFailure(
  domain: string,
  logger: LoggerLike | undefined,
  error: unknown,
  options: GraphqlRunnerOptions | undefined
): void {
  if (logger === undefined) {
    return;
  }

  const graphqlError = error as {
    extensions?: { code?: string };
    message?: string;
  };
  const code = graphqlError.extensions?.code;

  if (options?.kind === "mutation" && options.operation !== undefined) {
    logger.error({
      code,
      error: graphqlError.message ?? "Unknown mutation failure",
      event: `${domain}.mutation.failed`,
      operation: options.operation,
    });
    return;
  }

  if (code === "FORBIDDEN") {
    logger.warn({
      event: `${domain}.authorization.denied`,
      operation: options?.operation,
    });
    return;
  }

  if (
    code === "INTERNAL_SERVER_ERROR" ||
    (typeof code === "string" && code.endsWith("_REPOSITORY"))
  ) {
    logger.error({
      code,
      error: graphqlError.message ?? "Unknown graphql failure",
      event: `${domain}.graphql.failed`,
      operation: options?.operation,
    });
  }
}

export function createGraphqlRunner<R>(config: CreateGraphqlRunnerConfig<R>) {
  const { domain, errorMap, log, runtime } = config;

  const mapErrors = <A, E>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, GraphQLError, R> =>
    effect.pipe(
      Effect.catchAll((error) => {
        if (error instanceof GraphQLError) {
          return Effect.fail(error);
        }

        if (isZodError(error)) {
          return Effect.fail(
            toGraphQLError("Invalid input.", "BAD_USER_INPUT", 400, {
              issues: error.issues,
            })
          );
        }

        if (error instanceof UnauthenticatedError) {
          return Effect.fail(
            toGraphQLError(error.message, "UNAUTHENTICATED", 401)
          );
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "_tag" in error &&
          typeof error._tag === "string"
        ) {
          const mapped = mapTaggedError(
            error._tag,
            error as { message?: string; id?: string; issues?: unknown },
            errorMap
          );
          if (mapped !== null) {
            return Effect.fail(mapped);
          }
        }

        return Effect.fail(
          toGraphQLError(
            error instanceof Error ? error.message : "Unexpected error.",
            "INTERNAL_SERVER_ERROR",
            500
          )
        );
      })
    );

  return function runGraphqlEffect<A, E>(
    effect: Effect.Effect<A, E, R>,
    options?: GraphqlRunnerOptions
  ): Promise<A> {
    return runtime.runPromiseExit(mapErrors(effect)).then((exit) =>
      Exit.match(exit, {
        onFailure: (cause) => {
          const error = Cause.squash(cause);
          logGraphqlFailure(domain, log, error, options);
          throw error;
        },
        onSuccess: (value) => value,
      })
    );
  };
}
