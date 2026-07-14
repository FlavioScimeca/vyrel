import type { NextRequest } from "next/server";

import { createEdenClient } from "@/lib/eden-client";

/** Better Auth default session cookie name (httpOnly). */
export const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";

const noStoreFetch = { cache: "no-store" } as const;

type SessionResponse = {
  session: { activeOrganizationId: string | null; id: string } | null;
  user: { id: string } | null;
};

export type OrganizationAccess = {
  hasOrganizationAccess: boolean;
  isAuthenticated: boolean;
};

function requestHeaders(request: NextRequest): HeadersInit | undefined {
  const cookie = request.headers.get("cookie");

  if (cookie === null || cookie.length === 0) {
    return;
  }

  return { cookie };
}

/** Fast optimistic check — does not validate the session with the API. */
export function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.has(BETTER_AUTH_SESSION_COOKIE);
}

async function fetchSession(
  request: NextRequest
): Promise<SessionResponse | null> {
  const client = createEdenClient(requestHeaders(request));

  try {
    const { data, error, status } = await client.api.auth["get-session"].get({
      fetch: noStoreFetch,
    });

    if (error !== null || status >= 400) {
      return null;
    }

    if (data?.session === null || data?.session === undefined) {
      return null;
    }

    if (data.user === null || data.user === undefined) {
      return null;
    }

    return data as SessionResponse;
  } catch {
    return null;
  }
}

async function fetchOrganizationCount(request: NextRequest): Promise<number> {
  const client = createEdenClient(requestHeaders(request));

  try {
    const { data, error, status } = await client.api.auth.organization.list.get(
      {
        fetch: noStoreFetch,
      }
    );

    if (error !== null || status >= 400 || data === null) {
      return 0;
    }

    return data.length;
  } catch {
    return 0;
  }
}

/**
 * Active org on the session grants access. Otherwise fall back to membership list.
 * Only called when a session cookie is already present.
 */
export async function resolveOrganizationAccess(
  request: NextRequest
): Promise<OrganizationAccess> {
  const session = await fetchSession(request);

  if (session === null) {
    return { hasOrganizationAccess: false, isAuthenticated: false };
  }

  const activeOrganizationId = session.session?.activeOrganizationId;

  if (
    activeOrganizationId !== null &&
    activeOrganizationId !== undefined &&
    activeOrganizationId.length > 0
  ) {
    return { hasOrganizationAccess: true, isAuthenticated: true };
  }

  const organizationCount = await fetchOrganizationCount(request);

  return {
    hasOrganizationAccess: organizationCount > 0,
    isAuthenticated: true,
  };
}
