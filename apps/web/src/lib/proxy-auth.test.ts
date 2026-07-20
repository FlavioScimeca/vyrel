import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { BETTER_AUTH_SESSION_COOKIE, hasSessionCookie } from "./proxy-auth";

function requestWithCookie(path: string, cookie?: string) {
  const headers = cookie === undefined ? undefined : { cookie };
  return new NextRequest(new URL(`http://localhost:3001${path}`), { headers });
}

describe("proxy-auth", () => {
  it("detects the Better Auth session cookie", () => {
    const request = requestWithCookie(
      "/dashboard",
      `${BETTER_AUTH_SESSION_COOKIE}=abc123`
    );

    expect(hasSessionCookie(request)).toBe(true);
  });

  it("detects the secure-prefixed session cookie used in production", () => {
    const request = requestWithCookie(
      "/dashboard",
      `__Secure-${BETTER_AUTH_SESSION_COOKIE}=abc123`
    );

    expect(hasSessionCookie(request)).toBe(true);
  });

  it("returns false when the session cookie is missing", () => {
    const request = requestWithCookie("/dashboard");

    expect(hasSessionCookie(request)).toBe(false);
  });
});
