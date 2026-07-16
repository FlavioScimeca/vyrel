import type { OrganizationTypeById } from "../types/extra.types";
import {
  fetchOrganization,
  fetchOrganizationsForUser,
} from "../utils/auth-api";

export const getOrganization = (
  input: OrganizationTypeById,
  headers: Headers,
  jwtUserId?: string
) => fetchOrganization(input.id, headers, jwtUserId);

export const listOrganizations = (headers: Headers, jwtUserId?: string) =>
  fetchOrganizationsForUser(headers, jwtUserId);
