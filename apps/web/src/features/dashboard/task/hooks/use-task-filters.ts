"use client";

import type { CollectionMatch, VariablesOf } from "@vyrel/graphql-client";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useDebouncedCallback } from "use-debounce";

import type { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import type { TaskListItemData } from "@/features/dashboard/task/graphql/types";
import {
  applyTaskFilterSearchParams,
  CREATED_FROM_PARAM,
  CREATED_TO_PARAM,
  emptyTaskCommittedFilters,
  normalizeTaskDateRange,
  parseTaskFilterParams,
  SEARCH_PARAM,
  type TaskCommittedFilters,
  type TaskFilterQueryVariables,
  toTaskCommittedFilters,
  toTaskFilterDateRange,
  toTaskFilterQueryVariables,
} from "@/features/dashboard/task/lib/task-filter-params";

type UseTaskFiltersResult = {
  clearFilters: () => void;
  committedSearch: string;
  createdRange: DateRange | undefined;
  /** True when any filter is active in the UI (including in-progress search text). */
  hasActiveFilters: boolean;
  /** True when committed filters are sent to the server (debounced search + dates). */
  hasCommittedFilters: boolean;
  queryVariables: TaskFilterQueryVariables;
  search: string;
  setCreatedRange: (range: DateRange | undefined) => void;
  setSearch: (value: string) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

const isAscii = (value: string): boolean => {
  for (const character of value) {
    if ((character.codePointAt(0) ?? 0) > 127) {
      return false;
    }
  }
  return true;
};

const taskMatchesSearch = (task: TaskListItemData, search: string): boolean => {
  const needle = search.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }

  return (
    task.title.toLowerCase().includes(needle) ||
    (task.description?.toLowerCase().includes(needle) ?? false)
  );
};

const parseOptionalInstant = (
  value: string | null | undefined
): number | undefined => {
  if (value === null || value === undefined) {
    return;
  }

  const instant = new Date(value).getTime();
  return Number.isNaN(instant) ? undefined : instant;
};

const readFiltersFromLocation = (): TaskCommittedFilters => {
  const params = new URLSearchParams(window.location.search);
  return toTaskCommittedFilters(
    parseTaskFilterParams({
      createdFrom: params.get(CREATED_FROM_PARAM),
      createdTo: params.get(CREATED_TO_PARAM),
      search: params.get(SEARCH_PARAM),
    })
  );
};

export const matchesTaskFilters = (
  task: TaskListItemData,
  variables: Readonly<VariablesOf<typeof ListTasksDocument>>
): CollectionMatch => {
  const search = variables.search ?? "";
  // SQLite and JavaScript case folding can disagree for non-ASCII text.
  // Skipping an uncertain insertion is safer than briefly showing a false match.
  if (!isAscii(search)) {
    return "unknown";
  }

  if (!taskMatchesSearch(task, search)) {
    return false;
  }

  const createdAt = new Date(task.createdAt).getTime();
  if (Number.isNaN(createdAt)) {
    return "unknown";
  }

  const createdFrom = parseOptionalInstant(variables.createdFrom);
  const createdTo = parseOptionalInstant(variables.createdTo);

  if (
    (variables.createdFrom !== null &&
      variables.createdFrom !== undefined &&
      createdFrom === undefined) ||
    (variables.createdTo !== null &&
      variables.createdTo !== undefined &&
      createdTo === undefined)
  ) {
    return "unknown";
  }

  if (createdFrom !== undefined && createdAt < createdFrom) {
    return false;
  }

  if (createdTo !== undefined && createdAt > createdTo) {
    return false;
  }

  return true;
};

export function useTaskFilters(
  initialFilters: TaskCommittedFilters
): UseTaskFiltersResult {
  const pathname = usePathname();
  const [search, setSearchState] = useState(initialFilters.search);
  const [committed, setCommittedState] = useState(initialFilters);
  const committedRef = useRef(committed);
  committedRef.current = committed;

  const mirrorFiltersToUrl = useCallback(
    (filters: TaskCommittedFilters): void => {
      const next = new URLSearchParams(window.location.search);
      applyTaskFilterSearchParams(next, filters);
      const query = next.toString();
      const { hash } = window.location;
      const href =
        query.length > 0 ? `${pathname}?${query}${hash}` : `${pathname}${hash}`;

      window.history.replaceState(window.history.state, "", href);
    },
    [pathname]
  );

  const commitFilters = useCallback(
    (filters: TaskCommittedFilters): void => {
      committedRef.current = filters;
      setCommittedState(filters);
      setSearchState(filters.search);
      mirrorFiltersToUrl(filters);
    },
    [mirrorFiltersToUrl]
  );

  const commitSearch = useCallback(
    (value: string): void => {
      const normalized = value.trim();
      const next: TaskCommittedFilters = {
        ...committedRef.current,
        search: normalized,
      };
      committedRef.current = next;
      setCommittedState(next);
      setSearchState(normalized);
      mirrorFiltersToUrl(next);
    },
    [mirrorFiltersToUrl]
  );

  const debouncedCommitSearch = useDebouncedCallback(
    commitSearch,
    SEARCH_DEBOUNCE_MS
  );

  useEffect(() => {
    const onPopState = (): void => {
      debouncedCommitSearch.cancel();
      const next = readFiltersFromLocation();
      committedRef.current = next;
      setCommittedState(next);
      setSearchState(next.search);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [debouncedCommitSearch]);

  const setSearch = (value: string): void => {
    const normalized = value.trimStart();
    setSearchState(normalized);

    if (normalized.length === 0) {
      debouncedCommitSearch.cancel();
      commitSearch("");
      return;
    }

    debouncedCommitSearch(normalized);
  };

  const setCreatedRange = (range: DateRange | undefined): void => {
    if (range?.from === undefined) {
      const next: TaskCommittedFilters = {
        search: committedRef.current.search,
      };
      committedRef.current = next;
      setCommittedState(next);
      mirrorFiltersToUrl(next);
      return;
    }

    const normalizedRange = normalizeTaskDateRange(range.from, range.to);
    const next: TaskCommittedFilters = {
      createdFrom: normalizedRange.from,
      createdTo: normalizedRange.to,
      search: committedRef.current.search,
    };
    committedRef.current = next;
    setCommittedState(next);
    mirrorFiltersToUrl(next);
  };

  const clearFilters = (): void => {
    debouncedCommitSearch.cancel();
    commitFilters(emptyTaskCommittedFilters());
  };

  const queryVariables = toTaskFilterQueryVariables(committed);
  const hasDateFilters =
    committed.createdFrom !== undefined || committed.createdTo !== undefined;

  return {
    clearFilters,
    committedSearch: committed.search,
    createdRange: toTaskFilterDateRange(committed),
    hasActiveFilters: search.trim().length > 0 || hasDateFilters,
    hasCommittedFilters: committed.search.length > 0 || hasDateFilters,
    queryVariables,
    search,
    setCreatedRange,
    setSearch,
  };
}
