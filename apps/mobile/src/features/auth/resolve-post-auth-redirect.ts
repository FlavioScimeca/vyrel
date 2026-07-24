import type { Href } from "expo-router";

import { getApiBaseURL } from "@/lib/api-base-url";
import { defaultRouteForOrganization } from "@/lib/routes";
import { getSessionCookieHeaders } from "@/lib/session-cookie-headers";

type OrganizationListItem = { id: string };

export async function resolvePostAuthRedirect(): Promise<Href> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseURL()}/api/auth/organization/list`, {
      credentials: "omit",
      headers: getSessionCookieHeaders(),
      method: "GET",
    });
  } catch {
    return defaultRouteForOrganization(false);
  }

  if (!response.ok) {
    return defaultRouteForOrganization(false);
  }

  try {
    const data = (await response.json()) as OrganizationListItem[] | null;
    return defaultRouteForOrganization(Array.isArray(data) && data.length > 0);
  } catch {
    return defaultRouteForOrganization(false);
  }
}
