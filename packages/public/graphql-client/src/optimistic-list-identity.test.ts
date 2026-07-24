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

    identity.commit(optimisticId, "server-1");

    expect(identity.getKey("server-1")).toBe("optimistic-temp");
    expect(identity.getKey("optimistic-temp")).toBe("optimistic-temp");
  });

  it("accepts an explicit optimistic id in begin", () => {
    const identity = createOptimisticListIdentity();
    const optimisticId = identity.begin("optimistic-custom");

    expect(optimisticId).toBe("optimistic-custom");
    identity.commit(optimisticId, "server-2");
    expect(identity.getKey("server-2")).toBe("optimistic-custom");
  });

  it("abandons a pending optimistic id without binding a real id", () => {
    const identity = createOptimisticListIdentity({
      createId: () => "optimistic-aborted",
    });

    const optimisticId = identity.begin();
    identity.abandon(optimisticId);
    identity.commit(optimisticId, "server-3");

    expect(identity.getKey("server-3")).toBe("server-3");
  });

  it("commits concurrent creates by optimistic id when responses finish out of order", () => {
    const identity = createOptimisticListIdentity();
    const first = identity.begin("optimistic-a");
    const second = identity.begin("optimistic-b");

    identity.commit(second, "server-b");
    identity.commit(first, "server-a");

    expect(identity.getKey("server-a")).toBe(first);
    expect(identity.getKey("server-b")).toBe(second);
  });

  it("abandons only the selected concurrent create", () => {
    const identity = createOptimisticListIdentity();
    const first = identity.begin("optimistic-a");
    const second = identity.begin("optimistic-b");

    identity.abandon(first);
    identity.commit(second, "server-b");

    expect(identity.getKey("server-a")).toBe("server-a");
    expect(identity.getKey("server-b")).toBe(second);
  });

  it("ignores unknown or already settled optimistic ids", () => {
    const identity = createOptimisticListIdentity();
    const optimisticId = identity.begin("optimistic-a");

    identity.commit("optimistic-unknown", "server-unknown");
    identity.abandon("optimistic-unknown");
    identity.commit(optimisticId, "server-a");
    identity.commit(optimisticId, "server-repeated");

    expect(identity.getKey("server-unknown")).toBe("server-unknown");
    expect(identity.getKey("server-a")).toBe(optimisticId);
    expect(identity.getKey("server-repeated")).toBe("server-repeated");
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
