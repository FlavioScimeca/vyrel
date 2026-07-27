import { Cause, Data, Effect, Exit, type ManagedRuntime } from "effect";

export class HttpBoundaryError extends Data.TaggedError("HttpBoundaryError")<{
  readonly status: number;
  readonly body: Record<string, unknown>;
}> {}

export type HttpErrorMapping = {
  status: number;
  body: (error: {
    message?: string;
    id?: string;
    issues?: unknown;
  }) => Record<string, unknown>;
};

export type CreateHttpRunnerConfig<R> = {
  domain: string;
  errorMap: Record<string, HttpErrorMapping>;
  log?: {
    error: (payload: Record<string, unknown>) => void;
  };
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

export function createHttpRunner<R = never>(config: CreateHttpRunnerConfig<R>) {
  const { domain, errorMap, log, runtime } = config;

  const mapErrors = <A, E>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, HttpBoundaryError, R> =>
    effect.pipe(
      Effect.catchAll((error) => {
        if (error instanceof HttpBoundaryError) {
          return Effect.fail(error);
        }

        if (isZodError(error)) {
          return Effect.fail(
            new HttpBoundaryError({
              body: {
                issues: error.issues,
                message: "Invalid input.",
              },
              status: 400,
            })
          );
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "_tag" in error &&
          typeof error._tag === "string"
        ) {
          const mapping = errorMap[error._tag];
          if (mapping !== undefined) {
            return Effect.fail(
              new HttpBoundaryError({
                body: mapping.body(
                  error as { message?: string; id?: string; issues?: unknown }
                ),
                status: mapping.status,
              })
            );
          }
        }

        return Effect.fail(
          new HttpBoundaryError({
            body: {
              message:
                error instanceof Error ? error.message : "Unexpected error.",
            },
            status: 500,
          })
        );
      })
    );

  return function runHttpEffect<A, E>(
    effect: Effect.Effect<A, E, R>,
    options?: { operation?: string }
  ): Promise<A> {
    const mapped = mapErrors(effect);

    return runtime.runPromiseExit(mapped).then((exit) =>
      Exit.match(exit, {
        onFailure: (cause) => {
          const error = Cause.squash(cause);
          if (log !== undefined) {
            const httpError = error as HttpBoundaryError;
            log.error({
              body: httpError.body,
              event: `${domain}.rest.failed`,
              operation: options?.operation,
              status: httpError.status,
            });
          }
          throw error;
        },
        onSuccess: (value) => value,
      })
    );
  };
}
