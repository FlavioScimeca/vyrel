import { useEffect, useState, useTransition } from "react";

type TaskFilterQueryVariables = {
  createdFrom?: string;
  createdTo?: string;
  search?: string;
};

type UseTaskFiltersResult = {
  clearFilters: () => void;
  hasActiveFilters: boolean;
  queryVariables: TaskFilterQueryVariables;
  search: string;
  setSearch: (value: string) => void;
};

const SEARCH_DEBOUNCE_MS = 500;

export function useTaskFilters(): UseTaskFiltersResult {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(search);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [search]);

  const trimmedSearch = debouncedSearch.trim();
  const queryVariables: TaskFilterQueryVariables = {};

  if (trimmedSearch.length > 0) {
    queryVariables.search = trimmedSearch;
  }

  const hasActiveFilters = search.trim().length > 0;

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      setDebouncedSearch("");
    });
  };

  return {
    clearFilters,
    hasActiveFilters,
    queryVariables,
    search,
    setSearch,
  };
}
