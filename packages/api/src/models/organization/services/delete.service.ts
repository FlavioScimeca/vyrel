import { Effect } from "effect";

import {
  type OrganizationTypeDelete,
  organizationDeleteSchema,
} from "../types/base.types";
import { fetchOrganization } from "../utils/auth-api";
import {
  OrganizationRepositoryError,
  OrganizationValidationError,
} from "../utils/errors";
import { deleteAuthOrganization } from "./auth.service";

export const deleteOrganization = (
  input: OrganizationTypeDelete,
  headers: Headers,
  actorUserId?: string | null
) =>
  Effect.gen(function* () {
    const safeValues = organizationDeleteSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new OrganizationValidationError({
        issues: safeValues.error.issues,
        message: "Invalid organization delete request.",
      });
    }

    const { organizationId } = safeValues.data;
    const currentOrganization = yield* fetchOrganization(
      organizationId,
      headers,
      actorUserId
    );

    if (currentOrganization === null) {
      return yield* new OrganizationRepositoryError({
        cause: null,
        message: "Unable to delete organization without membership.",
      });
    }

    yield* deleteAuthOrganization({ organizationId }, headers, organizationId);

    return organizationId;
  });
