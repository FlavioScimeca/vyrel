import { cookies } from "next/headers";

import { createEdenClient } from "@/lib/eden-client";

const noStoreFetch = { cache: "no-store" } as const;

export type SessionResponse = {
  session: { activeOrganizationId: string | null; id: string } | null;
  user: { id: string } | null;
};

/** Fetch the Better Auth session from RSC using request cookies. */
export async function getServerSession(): Promise<SessionResponse | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (cookieHeader.length === 0) {
    return null;
  }

  return fetchSessionWithCookie(cookieHeader);
}

/** Fetch session using an explicit Cookie header (e.g. from middleware / proxy). */
export async function fetchSessionWithCookie(
  cookie: string,
  baseURL?: string
): Promise<SessionResponse | null> {
  const client = createEdenClient({ cookie }, baseURL);

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
