import { env } from "@vyrel/env/web";
import type { NextRequest } from "next/server";

const TRAILING_SLASH = /\/$/;

type SessionResponse = {
  session: { id: string } | null;
  user: { id: string } | null;
} | null;

function authApiUrl(path: string): string {
  return `${env.NEXT_PUBLIC_SERVER_URL.replace(TRAILING_SLASH, "")}/api/auth${path}`;
}

function requestHeaders(request: NextRequest): HeadersInit {
  const cookie = request.headers.get("cookie");

  if (cookie === null || cookie.length === 0) {
    return {};
  }

  return { cookie };
}

async function fetchSession(
  request: NextRequest
): Promise<SessionResponse | "error"> {
  try {
    const response = await fetch(authApiUrl("/get-session"), {
      cache: "no-store",
      headers: requestHeaders(request),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SessionResponse;

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

  try {
    const response = await fetch(authApiUrl("/organization/list"), {
      cache: "no-store",
      headers: requestHeaders(request),
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const organizations = (await response.json()) as unknown[];
    return organizations.length > 0;
  } catch {
    return null;
  }
}
