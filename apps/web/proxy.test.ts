import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

const proxyAuthMocks = vi.hoisted(() => ({
  hasSessionCookie: vi.fn(),
  resolveOrganizationAccess: vi.fn(),
}));

vi.mock("@/lib/proxy-auth", () => proxyAuthMocks);

const graphqlRequest = (): NextRequest =>
  new NextRequest("http://localhost:3001/api/graphql", {
    method: "POST",
  });

describe("proxy GraphQL bypass", () => {
  beforeEach(() => {
    proxyAuthMocks.hasSessionCookie.mockReset();
    proxyAuthMocks.resolveOrganizationAccess.mockReset();
  });

  it("bypasses auth resolution without a session cookie", async () => {
    proxyAuthMocks.hasSessionCookie.mockReturnValue(false);

    const response = await proxy(graphqlRequest());

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(proxyAuthMocks.resolveOrganizationAccess).not.toHaveBeenCalled();
  });

  it("bypasses auth resolution with a stale session cookie", async () => {
    proxyAuthMocks.hasSessionCookie.mockReturnValue(true);

    const response = await proxy(graphqlRequest());

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(proxyAuthMocks.resolveOrganizationAccess).not.toHaveBeenCalled();
  });
});
