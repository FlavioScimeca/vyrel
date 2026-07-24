import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const bearerMocks = vi.hoisted(() => ({
  verifyBearer: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  set: vi.fn(),
}));

vi.mock("@vyrel/auth", () => ({
  auth: {
    api: {
      getSession: authMocks.getSession,
    },
  },
}));

vi.mock("@vyrel/auth/lib/verify-bearer", () => ({
  verifyBearer: bearerMocks.verifyBearer,
}));

vi.mock("@vyrel/logging", () => ({
  createLogger: () => loggerMocks,
}));

vi.mock("@vyrel/logging/elysia", () => ({
  useLogger: () => loggerMocks,
}));

import { createGraphqlContext, requireActorUserId } from "./context";

const session = {
  session: { id: "session-1" },
  user: { id: "cookie-user" },
};

const bearerUser = {
  authorized: true,
  email: "bearer@example.com",
  emailVerified: true,
  id: "bearer-user",
  image: null,
  name: "Bearer User",
};

describe("GraphQL actor context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getSession.mockResolvedValue(null);
    bearerMocks.verifyBearer.mockResolvedValue(undefined);
  });

  it("prefers the cookie actor and reads the session exactly once", async () => {
    authMocks.getSession.mockResolvedValue(session);
    bearerMocks.verifyBearer.mockResolvedValue(bearerUser);

    const context = await createGraphqlContext(
      new Request("http://localhost/api/graphql")
    );

    expect(context.actorUserId).toBe("cookie-user");
    expect(context.isAuthenticated).toBe(true);
    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
    expect(requireActorUserId(context)).toBe("cookie-user");
  });

  it("forwards Authorization to Bearer verification and uses its actor", async () => {
    const request = new Request("http://localhost/api/graphql", {
      headers: { authorization: "Bearer signed-token" },
    });
    bearerMocks.verifyBearer.mockResolvedValue(bearerUser);

    const context = await createGraphqlContext(request);

    expect(bearerMocks.verifyBearer).toHaveBeenCalledWith(request.headers);
    expect(context.headers.get("authorization")).toBe("Bearer signed-token");
    expect(context.actorUserId).toBe("bearer-user");
  });

  it("rejects an expired cookie and invalid Bearer as unauthenticated", async () => {
    const context = await createGraphqlContext(
      new Request("http://localhost/api/graphql", {
        headers: {
          authorization: "Bearer expired-token",
          cookie: "better-auth.session_token=expired",
        },
      })
    );

    expect(context.actorUserId).toBeNull();
    expect(context.isAuthenticated).toBe(false);
    expect(() => requireActorUserId(context)).toThrow("UNAUTHENTICATED");
    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
  });
});
