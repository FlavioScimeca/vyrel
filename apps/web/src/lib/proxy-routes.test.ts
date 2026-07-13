import { describe, expect, it } from "vitest";

import {
  defaultRouteForOrganization,
  isOnboardingRoute,
  isPublicRoute,
} from "./proxy-routes";

describe("proxy-routes", () => {
  it("treats home and auth as public", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/auth")).toBe(true);
    expect(isPublicRoute("/auth/sign-in")).toBe(true);
    expect(isPublicRoute("/dashboard")).toBe(false);
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
