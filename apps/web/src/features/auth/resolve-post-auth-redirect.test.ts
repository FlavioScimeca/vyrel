import { describe, expect, it } from "vitest";

import { isSafeRedirectPath } from "./resolve-post-auth-redirect";

describe("isSafeRedirectPath", () => {
  it("allows dashboard and extension handoff paths", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true);
    expect(isSafeRedirectPath("/auth-succeeded")).toBe(true);
  });

  it("rejects auth routes and open redirects", () => {
    expect(isSafeRedirectPath("/auth")).toBe(false);
    expect(isSafeRedirectPath("/auth/sign-in")).toBe(false);
    expect(isSafeRedirectPath("//evil.example")).toBe(false);
    expect(isSafeRedirectPath("https://evil.example")).toBe(false);
  });
});
