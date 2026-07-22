import type { OrganizationTypeById } from "../types/extra.types";
import {
  fetchOrganization,
  fetchOrganizationsForUser,
} from "../utils/auth-api";

export const getOrganization = (
  input: OrganizationTypeById,
  headers: Headers,
  actorUserId?: string | null
) => fetchOrganization(input.id, headers, actorUserId);

export const listOrganizations = (
  headers: Headers,
  actorUserId?: string | null
) => fetchOrganizationsForUser(headers, actorUserId);
