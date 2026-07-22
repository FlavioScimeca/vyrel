import { describe, expect, it } from "vitest";

import {
  applyTaskFilterSearchParams,
  normalizeTaskDateRange,
  parseTaskFilterParams,
  toTaskCommittedFilters,
  toTaskFilterDateRange,
  toTaskFilterQueryVariables,
} from "./task-filter-params";

describe("task filter parameters", () => {
  it("normalizes a selected day into exact local-day boundaries", () => {
    const selected = new Date(2026, 6, 20, 12, 30);
    const range = normalizeTaskDateRange(selected);

    expect(range.from.getHours()).toBe(0);
    expect(range.from.getMinutes()).toBe(0);
    expect(range.to.getHours()).toBe(23);
    expect(range.to.getMinutes()).toBe(59);
    expect(range.to.getSeconds()).toBe(59);
    expect(range.to.getMilliseconds()).toBe(999);
  });

  it("keeps valid absolute instants unchanged for SSR and hydration", () => {
    const parsed = parseTaskFilterParams({
      createdFrom: "2026-07-19T22:00:00.000Z",
      createdTo: "2026-07-20T21:59:59.999Z",
      search: ["  release  ", "ignored"],
    });

    expect(parsed.queryVariables).toEqual({
      createdFrom: "2026-07-19T22:00:00.000Z",
      createdTo: "2026-07-20T21:59:59.999Z",
      search: "release",
    });
    expect(toTaskCommittedFilters(parsed)).toEqual({
      createdFrom: new Date("2026-07-19T22:00:00.000Z"),
      createdTo: new Date("2026-07-20T21:59:59.999Z"),
      search: "release",
    });
  });

  it("drops malformed and reversed date ranges", () => {
    expect(
      parseTaskFilterParams({
        createdFrom: "2026-07-21T00:00:00.000Z",
        createdTo: "2026-07-20T00:00:00.000Z",
      }).queryVariables
    ).toEqual({});
    expect(
      parseTaskFilterParams({ createdFrom: "not-a-date" }).queryVariables
    ).toEqual({});
  });

  it("builds query variables from committed filters", () => {
    const createdFrom = new Date("2026-07-20T00:00:00.000Z");
    const createdTo = new Date("2026-07-20T23:59:59.999Z");

    expect(
      toTaskFilterQueryVariables({
        createdFrom,
        createdTo,
        search: "release",
      })
    ).toEqual({
      createdFrom: createdFrom.toISOString(),
      createdTo: createdTo.toISOString(),
      search: "release",
    });
    expect(toTaskFilterQueryVariables({ search: "" })).toEqual({});
  });

  it("applies filter params while preserving unrelated keys", () => {
    const params = new URLSearchParams("view=compact&search=old");
    const createdFrom = new Date("2026-07-20T00:00:00.000Z");
    const createdTo = new Date("2026-07-20T23:59:59.999Z");

    applyTaskFilterSearchParams(params, {
      createdFrom,
      createdTo,
      search: "new",
    });

    expect(params.get("view")).toBe("compact");
    expect(params.get("search")).toBe("new");
    expect(params.get("createdFrom")).toBe(createdFrom.toISOString());
    expect(params.get("createdTo")).toBe(createdTo.toISOString());

    applyTaskFilterSearchParams(params, { search: "" });

    expect(params.get("view")).toBe("compact");
    expect(params.has("search")).toBe(false);
    expect(params.has("createdFrom")).toBe(false);
    expect(params.has("createdTo")).toBe(false);
  });

  it("maps same-day committed dates to a single-day calendar range", () => {
    const createdFrom = new Date(2026, 6, 20, 0, 0, 0, 0);
    const createdTo = new Date(2026, 6, 20, 23, 59, 59, 999);

    expect(
      toTaskFilterDateRange({
        createdFrom,
        createdTo,
        search: "",
      })
    ).toEqual({
      from: createdFrom,
      to: undefined,
    });

    const nextDay = new Date(2026, 6, 21, 23, 59, 59, 999);
    expect(
      toTaskFilterDateRange({
        createdFrom,
        createdTo: nextDay,
        search: "",
      })
    ).toEqual({
      from: createdFrom,
      to: nextDay,
    });
  });
});
