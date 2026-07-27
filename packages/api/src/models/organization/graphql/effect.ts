import { createGraphqlRunner } from "@vyrel/graphql/effect/create-graphql-runner";
import { log } from "@vyrel/logging";

import type { OrganizationServices } from "../services/organization.layer";
import { OrganizationRuntime } from "../services/organization.layer";

export const runOrganizationGraphqlEffect =
  createGraphqlRunner<OrganizationServices>({
    domain: "organization",
    errorMap: {
      OrganizationForbiddenError: { code: "FORBIDDEN", status: 403 },
      OrganizationMediaError: { code: "BAD_USER_INPUT", status: 400 },
      OrganizationNotFoundError: {
        code: "NOT_FOUND",
        message: (error) =>
          error.message ?? `Organization ${error.id} was not found.`,
        status: 404,
      },
      OrganizationRepositoryError: {
        code: "ORGANIZATION_REPOSITORY",
        status: 503,
      },
      OrganizationValidationError: {
        code: "BAD_USER_INPUT",
        extras: (error) =>
          error.issues === undefined ? undefined : { issues: error.issues },
        status: 400,
      },
    },
    log,
    runtime: OrganizationRuntime,
  });
