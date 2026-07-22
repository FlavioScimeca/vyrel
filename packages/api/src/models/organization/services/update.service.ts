import { Effect } from "effect";

import {
  type OrganizationTypeUpdate,
  organizationUpdateSchema,
} from "../types/base.types";
import { fetchOrganization } from "../utils/auth-api";
import {
  OrganizationRepositoryError,
  OrganizationValidationError,
} from "../utils/errors";
import {
  type UpdateOrganizationBody,
  updateAuthOrganization,
} from "./auth.service";
import { uploadOrganizationLogo } from "./logo.service";

export const updateOrganization = (
  input: OrganizationTypeUpdate,
  headers: Headers,
  actorUserId?: string | null
) =>
  Effect.gen(function* () {
    const safeValues = organizationUpdateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new OrganizationValidationError({
        issues: safeValues.error.issues,
        message: "Invalid organization update values.",
      });
    }

    const { logo, name, organizationId, slug } = safeValues.data;
    const body: UpdateOrganizationBody = {};

    if (name !== undefined) {
      body.name = name;
    }

    if (slug !== undefined) {
      body.slug = slug;
    }

    if (logo !== undefined) {
      const imageFields = yield* uploadOrganizationLogo(organizationId, logo);
      Object.assign(body, imageFields);
    }

    if (Object.keys(body).length > 0) {
      yield* updateAuthOrganization(
        {
          data: body,
          organizationId,
        },
        headers
      );
    }

    const record = yield* fetchOrganization(
      organizationId,
      headers,
      actorUserId
    );

    if (record === null) {
      return yield* new OrganizationRepositoryError({
        cause: null,
        message: "Organization was not updated.",
      });
    }

    return record;
  });
