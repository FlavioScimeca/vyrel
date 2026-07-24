import { parse } from "graphql";
import { describe, expect, it, vi } from "vitest";

vi.mock("@vyrel/env/server", () => ({
  env: {
    NODE_ENV: "test",
    PROFILE_SQL_LIMIT: 20,
  },
}));

vi.mock("../context", () => ({
  graphqlRequestLoggers: new WeakMap(),
}));

import { requireAuthPlugin } from "./plugins";

describe("requireAuthPlugin", () => {
  it("stops a protected operation with UNAUTHENTICATED", () => {
    const setResultAndStopExecution = vi.fn();

    requireAuthPlugin.onExecute?.({
      args: {
        contextValue: {
          actorUserId: null,
          isAuthenticated: false,
        },
        document: parse("query Protected { organizations { id } }"),
      },
      setResultAndStopExecution,
    } as never);

    expect(setResultAndStopExecution).toHaveBeenCalledTimes(1);
    const result = setResultAndStopExecution.mock.calls[0]?.[0];
    expect(result?.errors?.[0]?.extensions).toMatchObject({
      code: "UNAUTHENTICATED",
      http: { status: 401 },
    });
  });
});
