import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

const proxyAuthMocks = vi.hoisted(() => ({
  hasSessionCookie: vi.fn(),
}));

vi.mock("@/lib/proxy-auth", () => proxyAuthMocks);

const fetchMock = vi.fn();

function request(
  pathname: string,
  options?: { authorization?: string; method?: string }
): NextRequest {
  return new NextRequest(`http://localhost:3001${pathname}`, {
    headers:
      options?.authorization === undefined
        ? undefined
        : { authorization: options.authorization },
    method: options?.method,
  });
}

describe("local-only proxy auth guard", () => {
  beforeEach(() => {
    proxyAuthMocks.hasSessionCookie.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never performs backend fetches for navigation decisions", () => {
    proxyAuthMocks.hasSessionCookie
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    proxy(request("/dashboard"));
    proxy(request("/dashboard"));
    proxy(request("/api/graphql", { method: "POST" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "/api/graphql",
    "/api/auth/get-session",
    "/api/users",
    "/api/organizations",
  ])("always bypasses backend route %s", (pathname) => {
    proxyAuthMocks.hasSessionCookie.mockReturnValue(false);

    const response = proxy(request(pathname, { method: "POST" }));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(proxyAuthMocks.hasSessionCookie).not.toHaveBeenCalled();
  });

  it("preserves a Bearer request for the GraphQL rewrite", () => {
    const graphqlRequest = request("/api/graphql", {
      authorization: "Bearer token",
      method: "POST",
    });

    const response = proxy(graphqlRequest);

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(graphqlRequest.headers.get("authorization")).toBe("Bearer token");
  });

  it("bypasses GraphQL even when an expired session cookie is present", () => {
    const response = proxy(
      new NextRequest("http://localhost:3001/api/graphql", {
        headers: { cookie: "better-auth.session_token=expired" },
        method: "POST",
      })
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(proxyAuthMocks.hasSessionCookie).not.toHaveBeenCalled();
  });

  it("redirects a protected route without a cookie and preserves next", () => {
    proxyAuthMocks.hasSessionCookie.mockReturnValue(false);

    const response = proxy(request("/dashboard/tasks?search=one"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/auth?next=%2Fdashboard%2Ftasks%3Fsearch%3Done"
    );
  });

  it("lets a protected route continue when a cookie is present", () => {
    proxyAuthMocks.hasSessionCookie.mockReturnValue(true);

    const response = proxy(request("/dashboard/tasks"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps auth accessible with a stale cookie to avoid redirect loops", () => {
    proxyAuthMocks.hasSessionCookie.mockReturnValue(true);

    const response = proxy(request("/auth"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects home with a cookie to the server-validated dashboard", () => {
    proxyAuthMocks.hasSessionCookie.mockReturnValue(true);

    const response = proxy(request("/"));

    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/dashboard"
    );
  });
});
