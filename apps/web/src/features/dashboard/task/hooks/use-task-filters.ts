"use client";

import { useDeferredValue, useState } from "react";
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

export function useTaskFilters(): UseTaskFiltersResult {
  const [search, setSearch] = useState("");
  const [createdRange, setCreatedRange] = useState<DateRange | undefined>();
  const deferredSearch = useDeferredValue(search);

  const trimmedSearch = deferredSearch.trim();
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

  const clearFilters = () => {
    setSearch("");
    setCreatedRange(undefined);
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
