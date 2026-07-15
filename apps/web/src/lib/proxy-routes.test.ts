import { describe, expect, it } from "vitest";

import {
  defaultRouteForOrganization,
  isOnboardingRoute,
  isPublicRoute,
  shouldBypassAuthGuard,
} from "./proxy-routes";

describe("proxy-routes", () => {
  it("treats home and auth pages as public", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/auth")).toBe(true);
    expect(isPublicRoute("/auth/sign-in")).toBe(true);
    expect(isPublicRoute("/api/auth/sign-in/email")).toBe(false);
    expect(isPublicRoute("/dashboard")).toBe(false);
  });

  it("bypasses auth guard for auth API routes", () => {
    expect(shouldBypassAuthGuard("/api/auth/sign-in/email")).toBe(true);
    expect(shouldBypassAuthGuard("/api/auth/get-session")).toBe(true);
    expect(shouldBypassAuthGuard("/api/users")).toBe(true);
    expect(shouldBypassAuthGuard("/api/organizations")).toBe(true);
    expect(shouldBypassAuthGuard("/dashboard")).toBe(false);
  });

  it("detects onboarding route", () => {
    expect(isOnboardingRoute("/onboarding")).toBe(true);
    expect(isOnboardingRoute("/dashboard")).toBe(false);
  });

  it("picks default route from organization membership", () => {
    expect(defaultRouteForOrganization(true)).toBe("/dashboard");
    expect(defaultRouteForOrganization(false)).toBe("/onboarding");
  });
});
