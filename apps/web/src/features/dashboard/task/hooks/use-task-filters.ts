"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

export type TaskFilterQueryVariables = {
  createdFrom?: string;
  createdTo?: string;
  search?: string;
};

export type UseTaskFiltersResult = {
  clearFilters: () => void;
  createdRange: DateRange | undefined;
  hasActiveFilters: boolean;
  queryVariables: TaskFilterQueryVariables;
  search: string;
  setCreatedRange: (range: DateRange | undefined) => void;
  setSearch: (value: string) => void;
};

export function useTaskFilters(): UseTaskFiltersResult {
  const [search, setSearch] = useState("");
  const [createdRange, setCreatedRange] = useState<DateRange | undefined>();
  const deferredSearch = useDeferredValue(search);

  const queryVariables = useMemo((): TaskFilterQueryVariables => {
    const trimmedSearch = deferredSearch.trim();
    const variables: TaskFilterQueryVariables = {};

    if (trimmedSearch.length > 0) {
      variables.search = trimmedSearch;
    }

    if (createdRange?.from !== undefined) {
      variables.createdFrom = createdRange.from.toISOString();
    }

    if (createdRange?.to !== undefined) {
      variables.createdTo = createdRange.to.toISOString();
    }

    return variables;
  }, [createdRange, deferredSearch]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    createdRange?.from !== undefined ||
    createdRange?.to !== undefined;

  const clearFilters = useCallback(() => {
    setSearch("");
    setCreatedRange(undefined);
  }, []);

  return {
    clearFilters,
    createdRange,
    hasActiveFilters,
    queryVariables,
    search,
    setCreatedRange,
    setSearch,
  };
}
