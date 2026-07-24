import { useEffect, useMemo, useState, useTransition } from "react";

export type TaskPriorityFilter = "HIGH" | "LOW" | "MEDIUM" | "NONE";
export type TaskSort = "DUE_DATE" | "NEWEST" | "PRIORITY" | "RECENTLY_UPDATED";
export type TaskStatusFilter = "DONE" | "IN_PROGRESS" | "TODO";

type TaskFilterQueryVariables = {
  priorities?: TaskPriorityFilter[];
  search?: string;
  sort: TaskSort;
  statuses?: TaskStatusFilter[];
};

const SEARCH_DEBOUNCE_MS = 350;

export function useTaskFilters(initialStatus?: TaskStatusFilter) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statuses, setStatuses] = useState<TaskStatusFilter[]>(
    initialStatus === undefined ? [] : [initialStatus]
  );
  const [priorities, setPriorities] = useState<TaskPriorityFilter[]>([]);
  const [sort, setSort] = useState<TaskSort>("RECENTLY_UPDATED");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      startTransition(() => setDebouncedSearch(search));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const queryVariables = useMemo<TaskFilterQueryVariables>(() => {
    const variables: TaskFilterQueryVariables = { sort };
    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch.length > 0) {
      variables.search = trimmedSearch;
    }
    if (statuses.length > 0) {
      variables.statuses = statuses;
    }
    if (priorities.length > 0) {
      variables.priorities = priorities;
    }
    return variables;
  }, [debouncedSearch, priorities, sort, statuses]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatuses([]);
    setPriorities([]);
    setSort("RECENTLY_UPDATED");
  };

  const toggleStatus = (status: TaskStatusFilter) => {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status]
    );
  };

  const togglePriority = (priority: TaskPriorityFilter) => {
    setPriorities((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : [...current, priority]
    );
  };

  return {
    clearFilters,
    hasActiveFilters:
      search.trim().length > 0 ||
      statuses.length > 0 ||
      priorities.length > 0 ||
      sort !== "RECENTLY_UPDATED",
    priorities,
    queryVariables,
    search,
    setSearch,
    setSort,
    sort,
    statuses,
    togglePriority,
    toggleStatus,
  };
}
