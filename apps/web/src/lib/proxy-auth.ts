import type { NextRequest } from "next/server";

import { createEdenClient } from "@/lib/eden-client";

type SessionResponse = {
  session: { id: string } | null;
  user: { id: string } | null;
} | null;

function requestHeaders(request: NextRequest): HeadersInit | undefined {
  const cookie = request.headers.get("cookie");

  if (cookie === null || cookie.length === 0) {
    return;
  }

  return { cookie };
}

const noStoreFetch = { cache: "no-store" } as const;

async function fetchSession(
  request: NextRequest
): Promise<SessionResponse | "error"> {
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

    return data;
  } catch {
    return "error";
  }
}

/** Validates the Better Auth session via the API server (cookie-forwarded). */
export async function isRequestAuthenticated(
  request: NextRequest
): Promise<boolean> {
  const session = await fetchSession(request);
  return session !== null && session !== "error";
}

/**
 * Whether the authenticated user belongs to at least one organization.
 * Returns `null` when membership cannot be determined (missing session or upstream error).
 */
export async function fetchHasOrganizationMembership(
  request: NextRequest
): Promise<boolean | null> {
  const session = await fetchSession(request);

  if (session === null) {
    return null;
  }

  if (session === "error") {
    return null;
  }

  const client = createEdenClient(requestHeaders(request));

  try {
    const { data, error, status } = await client.api.auth.organization.list.get(
      {
        fetch: noStoreFetch,
      }
    );

    if (status === 401 || error !== null) {
      return null;
    }

    if (status >= 400) {
      return null;
    }

    return data.length > 0;
  } catch {
    return null;
  }
}
