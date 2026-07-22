// @vitest-environment jsdom

import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";
import { isUnauthenticatedError } from "./unauthenticated";
import { getAuthRedirectHref } from "./unauthenticated.client";

describe("isUnauthenticatedError", () => {
  it("recognizes GraphQL UNAUTHENTICATED errors", () => {
    const error = new CombinedGraphQLErrors({
      errors: [
        {
          extensions: { code: "UNAUTHENTICATED" },
          message: "Authentication required",
        },
      ],
    });

    expect(isUnauthenticatedError(error)).toBe(true);
  });

  it("recognizes HTTP 401 responses", () => {
    const error = new ServerError("Unauthorized", {
      bodyText: "Unauthorized",
      response: new Response(null, { status: 401 }),
    });

    expect(isUnauthenticatedError(error)).toBe(true);
  });

  it("does not treat forbidden or server failures as unauthenticated", () => {
    const forbidden = new ServerError("Forbidden", {
      bodyText: "Forbidden",
      response: new Response(null, { status: 403 }),
    });

    expect(isUnauthenticatedError(forbidden)).toBe(false);
    expect(isUnauthenticatedError(new Error("Network unavailable"))).toBe(
      false
    );
  });
});

describe("getAuthRedirectHref", () => {
  it("preserves the full destination", () => {
    expect(
      getAuthRedirectHref("/dashboard/tasks", "?search=test", "#results")
    ).toBe("/auth?next=%2Fdashboard%2Ftasks%3Fsearch%3Dtest%23results");
  });

  it("does not redirect auth pages or confuse similarly named routes", () => {
    expect(getAuthRedirectHref("/auth", "", "")).toBeUndefined();
    expect(getAuthRedirectHref("/auth/sign-in", "", "")).toBeUndefined();
    expect(getAuthRedirectHref("/author", "", "")).toBe("/auth?next=%2Fauthor");
  });
});
