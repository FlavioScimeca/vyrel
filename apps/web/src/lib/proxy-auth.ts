import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";

/** Better Auth session cookie base name (without the `__Secure-` production prefix). */
export const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";

/** Fast optimistic check — does not validate the session with the API. */
export function hasSessionCookie(request: NextRequest): boolean {
  return getSessionCookie(request) !== null;
}
