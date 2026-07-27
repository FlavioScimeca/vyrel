import { createHttpRunner } from "@vyrel/graphql/effect/create-http-runner";
import { log } from "@vyrel/logging";
import type { Effect } from "effect";

import type { CreateOrganizationServiceResult } from "../services/create.service";
import type { OrganizationServices } from "../services/organization.layer";
import { OrganizationRuntime } from "../services/organization.layer";
import type { OrganizationError } from "../utils/errors";

// biome-ignore lint/performance/noBarrelFile: _
export { HttpBoundaryError as OrganizationHttpError } from "@vyrel/graphql/effect/create-http-runner";

const runOrganizationHttpEffect = createHttpRunner<OrganizationServices>({
  domain: "organization",
  errorMap: {
    OrganizationForbiddenError: {
      body: (error) => ({ message: error.message }),
      status: 403,
    },
    OrganizationMediaError: {
      body: (error) => ({ message: error.message }),
      status: 400,
    },
    OrganizationNotFoundError: {
      body: (error) => ({
        message: error.message ?? `Organization ${error.id} was not found.`,
      }),
      status: 404,
    },
    OrganizationRepositoryError: {
      body: (error) => ({ message: error.message }),
      status: 503,
    },
    OrganizationValidationError: {
      body: (error) => ({
        issues: error.issues,
        message: error.message,
      }),
      status: 400,
    },
  },
  log,
  runtime: OrganizationRuntime,
});

export function runOrganizationCreateEffect(
  effect: Effect.Effect<
    CreateOrganizationServiceResult,
    OrganizationError,
    OrganizationServices
  >
): Promise<CreateOrganizationServiceResult> {
  return runOrganizationHttpEffect(effect, {
    operation: "createOrganization",
  });
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
