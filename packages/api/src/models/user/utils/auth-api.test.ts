import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

vi.mock("@vyrel/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@vyrel/db", () => ({ db: {} }));
vi.mock("@vyrel/db/schema", () => ({ user: {} }));

import { resolveAuthenticatedUserId } from "./auth-api";

describe("resolveAuthenticatedUserId", () => {
  it("reuses a request-scoped authenticated actor", async () => {
    await expect(
      Effect.runPromise(
        resolveAuthenticatedUserId(new Headers(), "request-actor")
      )
    ).resolves.toBe("request-actor");
  });

  it("preserves a previously resolved unauthenticated actor", async () => {
    await expect(
      Effect.runPromise(resolveAuthenticatedUserId(new Headers(), null))
    ).resolves.toBeNull();
  });
});
