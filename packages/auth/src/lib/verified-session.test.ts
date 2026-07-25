import { afterEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: { NODE_ENV: "test" as "development" | "production" | "test" },
}));

vi.mock("@vyrel/env/server", () => ({
  env: envMock,
}));

import { onlyVerifiedSession } from "./verified-session";

describe("onlyVerifiedSession", () => {
  afterEach(() => {
    envMock.NODE_ENV = "test";
  });

  it("keeps a verified session", () => {
    const session = {
      session: { id: "session-1" },
      user: { emailVerified: true, id: "user-1" },
    };

    expect(onlyVerifiedSession(session)).toBe(session);
  });

  it("rejects an unverified session outside development", () => {
    envMock.NODE_ENV = "production";

    expect(
      onlyVerifiedSession({
        session: { id: "session-1" },
        user: { emailVerified: false, id: "user-1" },
      })
    ).toBeNull();
  });

  it("keeps an unverified session in development", () => {
    envMock.NODE_ENV = "development";

    const session = {
      session: { id: "session-1" },
      user: { emailVerified: false, id: "user-1" },
    };

    expect(onlyVerifiedSession(session)).toBe(session);
  });

  it("keeps an absent session unauthenticated", () => {
    expect(onlyVerifiedSession(null)).toBeNull();
  });
});
