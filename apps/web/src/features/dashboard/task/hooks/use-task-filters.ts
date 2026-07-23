"use client";

import { useEffect, useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";

type TaskFilterQueryVariables = {
  createdFrom?: string;
  createdTo?: string;
  search?: string;
};

type UseTaskFiltersResult = {
  clearFilters: () => void;
  createdRange: DateRange | undefined;
  hasActiveFilters: boolean;
  queryVariables: TaskFilterQueryVariables;
  search: string;
  setCreatedRange: (range: DateRange | undefined) => void;
  setSearch: (value: string) => void;
};

const SEARCH_DEBOUNCE_MS = 500;

export function useTaskFilters(): UseTaskFiltersResult {
  const [search, setSearch] = useState("");
  const [createdRange, setCreatedRangeState] = useState<
    DateRange | undefined
  >();
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [, startTransition] = useTransition();

  // Debounced search drives query variables inside a transition so
  // useSuspenseQuery keeps the current list instead of showing the skeleton.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(search);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const trimmedSearch = debouncedSearch.trim();
  const queryVariables: TaskFilterQueryVariables = {};

  if (trimmedSearch.length > 0) {
    queryVariables.search = trimmedSearch;
  }

  if (createdRange?.from !== undefined) {
    queryVariables.createdFrom = createdRange.from.toISOString();
  }

  if (createdRange?.to !== undefined) {
    queryVariables.createdTo = createdRange.to.toISOString();
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    createdRange?.from !== undefined ||
    createdRange?.to !== undefined;

  const setCreatedRange = (range: DateRange | undefined) => {
    startTransition(() => {
      setCreatedRangeState(range);
    });
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      setDebouncedSearch("");
      setCreatedRangeState(undefined);
    });
  };

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
