// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { matchesTaskFilters, useTaskFilters } from "./use-task-filters";

const task = {
  createdAt: "2026-07-20T10:00:00.000Z",
  description: "Release details",
  id: "task-1",
  imageFull: null,
  imageThumb: null,
  title: "Test release",
  updatedAt: "2026-07-20T10:00:00.000Z",
};

const emptyFilters = { search: "" };

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
}));

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState({}, "", "/dashboard/tasks");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useTaskFilters", () => {
  it("debounces the committed search and URL update", async () => {
    const { result } = renderHook(() => useTaskFilters(emptyFilters));

    act(() => {
      result.current.setSearch("  release");
    });

    expect(result.current.search).toBe("release");
    expect(result.current.committedSearch).toBe("");
    expect(result.current.queryVariables.search).toBeUndefined();
    expect(window.location.search).toBe("");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.committedSearch).toBe("release");
    expect(result.current.queryVariables.search).toBe("release");
    expect(window.location.search).toBe("?search=release");
  });

  it("keeps committed search after debounce without a useSearchParams feedback loop", async () => {
    const { result } = renderHook(() => useTaskFilters(emptyFilters));

    act(() => {
      result.current.setSearch("release");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.search).toBe("release");
    expect(result.current.committedSearch).toBe("release");
    expect(result.current.queryVariables.search).toBe("release");
    expect(window.location.search).toBe("?search=release");
  });

  it("commits date filters to queryVariables and createdRange", () => {
    const { result } = renderHook(() => useTaskFilters(emptyFilters));
    const createdFrom = new Date("2026-07-20T12:00:00.000Z");
    const expectedFrom = new Date(createdFrom);
    expectedFrom.setHours(0, 0, 0, 0);
    const expectedTo = new Date(createdFrom);
    expectedTo.setHours(23, 59, 59, 999);

    act(() => {
      result.current.setCreatedRange({ from: createdFrom });
    });

    expect(result.current.createdRange?.from?.getTime()).toBe(
      expectedFrom.getTime()
    );
    expect(result.current.createdRange?.to).toBeUndefined();
    expect(result.current.queryVariables.createdFrom).toBe(
      expectedFrom.toISOString()
    );
    expect(result.current.queryVariables.createdTo).toBe(
      expectedTo.toISOString()
    );
    expect(result.current.hasCommittedFilters).toBe(true);
    expect(new URLSearchParams(window.location.search).get("createdFrom")).toBe(
      expectedFrom.toISOString()
    );
    expect(new URLSearchParams(window.location.search).get("createdTo")).toBe(
      expectedTo.toISOString()
    );
  });

  it("preserves a pending search when another filter updates the URL", async () => {
    window.history.replaceState({}, "", "/dashboard/tasks?view=compact");
    const { result } = renderHook(() => useTaskFilters({ search: "old" }));
    const createdFrom = new Date("2026-07-20T00:00:00.000Z");
    const expectedFrom = new Date(createdFrom);
    expectedFrom.setHours(0, 0, 0, 0);
    const expectedTo = new Date(createdFrom);
    expectedTo.setHours(23, 59, 59, 999);

    act(() => {
      result.current.setSearch("new");
      result.current.setCreatedRange({ from: createdFrom });
    });

    expect(result.current.search).toBe("new");
    expect(window.location.search).toContain("view=compact");
    expect(new URLSearchParams(window.location.search).get("createdFrom")).toBe(
      expectedFrom.toISOString()
    );
    expect(new URLSearchParams(window.location.search).get("createdTo")).toBe(
      expectedTo.toISOString()
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.search).toBe("new");
    expect(result.current.committedSearch).toBe("new");
    expect(window.location.search).toContain("search=new");
    expect(window.location.search).toContain("view=compact");
    expect(new URLSearchParams(window.location.search).get("createdFrom")).toBe(
      expectedFrom.toISOString()
    );
  });

  it("cancels a pending search when filters are cleared", async () => {
    const createdFrom = new Date("2026-07-20T00:00:00.000Z");
    const { result } = renderHook(() =>
      useTaskFilters({
        createdFrom,
        createdTo: createdFrom,
        search: "",
      })
    );

    act(() => {
      result.current.setSearch("release");
      result.current.clearFilters();
    });

    expect(result.current.search).toBe("");
    expect(result.current.committedSearch).toBe("");
    expect(result.current.queryVariables).toEqual({});
    expect(result.current.createdRange).toBeUndefined();
    expect(window.location.search).toBe("");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.committedSearch).toBe("");
    expect(window.location.search).toBe("");
  });

  it("normalizes whitespace in both the URL and visible search", async () => {
    const { result } = renderHook(() => useTaskFilters(emptyFilters));

    act(() => {
      result.current.setSearch("release  ");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.search).toBe("release");
    expect(result.current.queryVariables.search).toBe("release");
  });

  it("cancels a pending URL write when unmounted", async () => {
    const { result, unmount } = renderHook(() => useTaskFilters(emptyFilters));

    act(() => {
      result.current.setSearch("orphaned");
    });
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(window.location.search).toBe("");
  });

  it("hydrates from initialFilters without reading useSearchParams", () => {
    const createdFrom = new Date("2026-07-20T00:00:00.000Z");
    const createdTo = new Date("2026-07-20T23:59:59.999Z");
    const { result } = renderHook(() =>
      useTaskFilters({
        createdFrom,
        createdTo,
        search: "ugo",
      })
    );

    expect(result.current.search).toBe("ugo");
    expect(result.current.committedSearch).toBe("ugo");
    expect(result.current.queryVariables).toEqual({
      createdFrom: createdFrom.toISOString(),
      createdTo: createdTo.toISOString(),
      search: "ugo",
    });
    expect(result.current.hasCommittedFilters).toBe(true);
  });
});

describe("matchesTaskFilters", () => {
  it("matches the active search and exact date interval", () => {
    expect(
      matchesTaskFilters(task, {
        createdFrom: "2026-07-20T00:00:00.000Z",
        createdTo: "2026-07-20T23:59:59.999Z",
        organizationId: "org-1",
        search: "test",
      })
    ).toBe(true);

    expect(
      matchesTaskFilters(task, {
        createdFrom: "2026-07-21T00:00:00.000Z",
        organizationId: "org-1",
        search: "test",
      })
    ).toBe(false);
  });

  it("skips optimistic insertion when client and server matching may differ", () => {
    expect(
      matchesTaskFilters(task, {
        organizationId: "org-1",
        search: "tèst",
      })
    ).toBe("unknown");
  });
});
