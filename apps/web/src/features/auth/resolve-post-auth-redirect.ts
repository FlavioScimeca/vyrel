import { createEdenClient } from "@/lib/eden-client";
import { defaultRouteForOrganization } from "@/lib/proxy-routes";
import { getWebApiBaseURL } from "@/lib/web-api-base-url";

export function isSafeRedirectPath(path: string): boolean {
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth")
  );
}

export async function resolvePostAuthRedirect(
  next: string | null
): Promise<string> {
  if (next !== null && isSafeRedirectPath(next)) {
    return next;
  }

  const client = createEdenClient(undefined, getWebApiBaseURL());
  const { data, error, status } = await client.api.auth.organization.list.get();

  if (error !== null || status >= 400 || data === null) {
    return defaultRouteForOrganization(false);
  }

  return defaultRouteForOrganization(data.length > 0);
}
