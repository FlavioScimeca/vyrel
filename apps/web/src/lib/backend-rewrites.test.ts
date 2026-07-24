import { describe, expect, it } from "vitest";

import { createBackendRewrites } from "./backend-rewrites";

describe("backend rewrites", () => {
  it("rewrites only the exact GraphQL endpoint", () => {
    const rewrites = createBackendRewrites("http://server:3000");
    const graphqlRewrite = rewrites.find(
      (rewrite) => rewrite.source === "/api/graphql"
    );

    expect(graphqlRewrite).toEqual({
      destination: "http://server:3000/api/graphql",
      source: "/api/graphql",
    });
    expect(
      rewrites.some((rewrite) => rewrite.source === "/api/graphql/:path*")
    ).toBe(false);
  });
});
