import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { useTaskFilters } from "./use-task-filters";

describe("useTaskFilters", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces search and composes status, priority, and sort filters", async () => {
    const { result } = await renderHook(() => useTaskFilters("TODO"));

    await act(() => {
      result.current.setSearch(" launch ");
      result.current.togglePriority("HIGH");
      result.current.setSort("PRIORITY");
    });
    await act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(result.current.queryVariables).toEqual({
      priorities: ["HIGH"],
      search: "launch",
      sort: "PRIORITY",
      statuses: ["TODO"],
    });
  });

  it("clears every active filter", async () => {
    const { result } = await renderHook(() => useTaskFilters("DONE"));

    await act(() => {
      result.current.setSearch("draft");
      result.current.togglePriority("LOW");
      result.current.clearFilters();
    });
    await act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.queryVariables).toEqual({
      sort: "RECENTLY_UPDATED",
    });
  });
});
