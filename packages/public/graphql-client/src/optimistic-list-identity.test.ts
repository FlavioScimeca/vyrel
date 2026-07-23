import { describe, expect, it } from "vitest";

import { createOptimisticListIdentity } from "./optimistic-list-identity";

describe("createOptimisticListIdentity", () => {
  it("returns a stable key across optimistic → real id commit", () => {
    const identity = createOptimisticListIdentity({
      createId: () => "optimistic-temp",
    });

    const optimisticId = identity.begin();
    expect(optimisticId).toBe("optimistic-temp");
    expect(identity.getKey(optimisticId)).toBe("optimistic-temp");

    identity.commit("server-1");

    expect(identity.getKey("server-1")).toBe("optimistic-temp");
    expect(identity.getKey("optimistic-temp")).toBe("optimistic-temp");
  });

  it("accepts an explicit optimistic id in begin", () => {
    const identity = createOptimisticListIdentity();
    const optimisticId = identity.begin("optimistic-custom");

    expect(optimisticId).toBe("optimistic-custom");
    identity.commit("server-2");
    expect(identity.getKey("server-2")).toBe("optimistic-custom");
  });

  it("abandons a pending optimistic id without binding a real id", () => {
    const identity = createOptimisticListIdentity({
      createId: () => "optimistic-aborted",
    });

    identity.begin();
    identity.abandon();
    identity.commit("server-3");

    expect(identity.getKey("server-3")).toBe("server-3");
  });

  it("matches FIFO order for concurrent pending creates", () => {
    const identity = createOptimisticListIdentity();
    const first = identity.begin("optimistic-a");
    const second = identity.begin("optimistic-b");

    identity.commit("server-a");
    identity.commit("server-b");

    expect(identity.getKey("server-a")).toBe(first);
    expect(identity.getKey("server-b")).toBe(second);
  });

  it("detects optimistic ids by prefix", () => {
    const identity = createOptimisticListIdentity({ prefix: "tmp-" });

    expect(identity.isOptimisticId("tmp-1")).toBe(true);
    expect(identity.isOptimisticId("server-1")).toBe(false);
    expect(identity.begin().startsWith("tmp-")).toBe(true);
  });

  it("falls back to the entity id when no binding exists", () => {
    const identity = createOptimisticListIdentity();
    expect(identity.getKey("unknown")).toBe("unknown");
  });
});
