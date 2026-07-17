import { Cause, Data, Effect, Exit } from "effect";

import type { CreateOrganizationServiceResult } from "../services/create.service";
import type { OrganizationError } from "../utils/errors";

export class OrganizationHttpError extends Data.TaggedError(
  "OrganizationHttpError"
)<{
  readonly status: number;
  readonly body: Record<string, unknown>;
}> {}

function organizationHttpError(
  status: number,
  body: Record<string, unknown>
): OrganizationHttpError {
  return new OrganizationHttpError({ body, status });
}

const mapOrganizationErrorsToHttp = <A>(
  effect: Effect.Effect<A, OrganizationError>
): Effect.Effect<A, OrganizationHttpError> =>
  effect.pipe(
    Effect.catchTags({
      OrganizationForbiddenError: (error) =>
        Effect.fail(
          organizationHttpError(403, {
            message: error.message,
          })
        ),
      OrganizationMediaError: (error) =>
        Effect.fail(
          organizationHttpError(400, {
            message: error.message,
          })
        ),
      OrganizationNotFoundError: (error) =>
        Effect.fail(
          organizationHttpError(404, {
            message: error.message ?? `Organization ${error.id} was not found.`,
          })
        ),
      OrganizationRepositoryError: (error) =>
        Effect.fail(
          organizationHttpError(503, {
            message: error.message,
          })
        ),
      OrganizationValidationError: (error) =>
        Effect.fail(
          organizationHttpError(400, {
            issues: error.issues,
            message: error.message,
          })
        ),
    })
  );

export function runOrganizationCreateEffect(
  effect: Effect.Effect<CreateOrganizationServiceResult, OrganizationError>
): Promise<CreateOrganizationServiceResult> {
  return Effect.runPromiseExit(mapOrganizationErrorsToHttp(effect)).then(
    (exit) =>
      Exit.match(exit, {
        onFailure: (cause) => {
          throw Cause.squash(cause);
        },
        onSuccess: (value) => value,
      })
  );
}

type OrganizationCreateSetContext = {
  headers: {
    [key: string]: string | number | string[] | undefined;
  };
  status?: number | string;
};

export function finishOrganizationCreate(
  set: OrganizationCreateSetContext,
  result: CreateOrganizationServiceResult
) {
  set.status = 201;

  if (result.setCookies.length === 1) {
    set.headers["set-cookie"] = result.setCookies[0];
  } else if (result.setCookies.length > 1) {
    set.headers["set-cookie"] = [...result.setCookies];
  }

  return {
    organization: result.organization,
    ...(result.mediaWarning === undefined
      ? {}
      : { mediaWarning: result.mediaWarning }),
  };
}
