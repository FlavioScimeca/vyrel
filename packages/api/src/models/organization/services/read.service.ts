import type { OrganizationTypeById } from "../types/extra.types";
import {
  fetchOrganization,
  fetchOrganizationsForUser,
} from "../utils/auth-api";

export const getOrganization = (
  input: OrganizationTypeById,
  actorUserId: string
) => fetchOrganization(input.id, actorUserId);

export const listOrganizations = (actorUserId: string) =>
  fetchOrganizationsForUser(actorUserId);
