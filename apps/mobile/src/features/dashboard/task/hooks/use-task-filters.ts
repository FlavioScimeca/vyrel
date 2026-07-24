import { useEffect, useMemo, useState, useTransition } from "react";

import { localDateDaysFromNow, toLocalDate } from "@/lib/local-date";

export type TaskPriorityFilter = "HIGH" | "LOW" | "MEDIUM" | "NONE";
export type TaskSort = "DUE_DATE" | "NEWEST" | "PRIORITY" | "RECENTLY_UPDATED";
export type TaskStatusFilter = "DONE" | "IN_PROGRESS" | "TODO";
export type TaskDueFilter = "ALL" | "OVERDUE" | "TODAY";

type TaskFilterQueryVariables = {
  assigneeId?: string;
  dueFrom?: string;
  dueTo?: string;
  labelIds?: string[];
  priorities?: TaskPriorityFilter[];
  search?: string;
  sort: TaskSort;
  statuses?: TaskStatusFilter[];
};

const SEARCH_DEBOUNCE_MS = 350;

const hasFilters = ({
  assigneeId,
  due,
  labelIds,
  priorities,
  search,
  sort,
  statuses,
}: {
  assigneeId: string;
  due: TaskDueFilter;
  labelIds: string[];
  priorities: TaskPriorityFilter[];
  search: string;
  sort: TaskSort;
  statuses: TaskStatusFilter[];
}): boolean =>
  search.trim().length > 0 ||
  statuses.length > 0 ||
  priorities.length > 0 ||
  assigneeId.length > 0 ||
  labelIds.length > 0 ||
  due !== "ALL" ||
  sort !== "RECENTLY_UPDATED";

export function useTaskFilters(initialStatus?: TaskStatusFilter) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statuses, setStatuses] = useState<TaskStatusFilter[]>(
    initialStatus === undefined ? [] : [initialStatus]
  );
  const [priorities, setPriorities] = useState<TaskPriorityFilter[]>([]);
  const [sort, setSort] = useState<TaskSort>("RECENTLY_UPDATED");
  const [assigneeId, setAssigneeId] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [due, setDue] = useState<TaskDueFilter>("ALL");
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
    if (assigneeId.length > 0) {
      variables.assigneeId = assigneeId;
    }
    if (labelIds.length > 0) {
      variables.labelIds = labelIds;
    }
    if (due === "TODAY") {
      const today = toLocalDate(new Date());
      variables.dueFrom = today;
      variables.dueTo = today;
    } else if (due === "OVERDUE") {
      variables.dueTo = localDateDaysFromNow(-1);
    }
    return variables;
  }, [assigneeId, debouncedSearch, due, labelIds, priorities, sort, statuses]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatuses([]);
    setPriorities([]);
    setAssigneeId("");
    setLabelIds([]);
    setDue("ALL");
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

  const toggleLabel = (labelId: string) => {
    setLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((item) => item !== labelId)
        : [...current, labelId]
    );
  };

  return {
    assigneeId,
    clearFilters,
    hasActiveFilters: hasFilters({
      assigneeId,
      due,
      labelIds,
      priorities,
      search,
      sort,
      statuses,
    }),
    due,
    labelIds,
    priorities,
    queryVariables,
    search,
    setSearch,
    setAssigneeId,
    setDue,
    setSort,
    sort,
    statuses,
    togglePriority,
    toggleLabel,
    toggleStatus,
  };
}
