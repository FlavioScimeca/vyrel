import { env } from "@vyrel/env/web";
import { getSessionCookie } from "better-auth/cookies";
import { cookies } from "next/headers";
import { cache } from "react";

export type ServerAuthState = {
  activeOrganizationId: string | null;
  hasOrganizationAccess: boolean;
  session: { id: string };
  user: { id: string };
};

async function fetchServerAuthState(): Promise<ServerAuthState | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (
    cookieHeader.length === 0 ||
    getSessionCookie(new Headers({ cookie: cookieHeader })) === null
  ) {
    return null;
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_SERVER_URL}/api/auth/bootstrap`,
    {
      cache: "no-store",
      headers: { cookie: cookieHeader },
      method: "POST",
    }
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Authentication bootstrap failed with status ${response.status}`
    );
  }

  return (await response.json()) as ServerAuthState;
}

/**
 * A single request-scoped auth/bootstrap promise shared by layouts and pages.
 * Infrastructure failures intentionally reject instead of masquerading as logout.
 */
export const getServerAuthState = cache(fetchServerAuthState);
