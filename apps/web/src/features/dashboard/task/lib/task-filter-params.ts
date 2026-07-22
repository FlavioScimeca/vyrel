import type { VariablesOf } from "@vyrel/graphql-client";
import type { DateRange } from "react-day-picker";

import type { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";

export type TaskFilterQueryVariables = Omit<
  VariablesOf<typeof ListTasksDocument>,
  "organizationId"
>;

export type TaskCommittedFilters = {
  readonly createdFrom?: Date;
  readonly createdTo?: Date;
  readonly search: string;
};

type SearchParamValue = string | readonly string[] | null | undefined;

type TaskFilterParamValues = {
  createdFrom?: SearchParamValue;
  createdTo?: SearchParamValue;
  search?: SearchParamValue;
};

type ParsedTaskFilterParams = {
  committedSearch: string;
  createdFrom: Date | undefined;
  createdTo: Date | undefined;
  queryVariables: TaskFilterQueryVariables;
};

export type TaskDateRange = {
  readonly from: Date;
  readonly to: Date;
};

export const SEARCH_PARAM = "search";
export const CREATED_FROM_PARAM = "createdFrom";
export const CREATED_TO_PARAM = "createdTo";

const EMPTY_COMMITTED_FILTERS: TaskCommittedFilters = { search: "" };

const firstValue = (value: SearchParamValue): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  return value?.[0];
};

const parseDate = (value: SearchParamValue): Date | undefined => {
  const normalized = firstValue(value);

  if (normalized === undefined) {
    return;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const startOfLocalDay = (date: Date): Date => {
  const boundary = new Date(date);
  boundary.setHours(0, 0, 0, 0);
  return boundary;
};

const endOfLocalDay = (date: Date): Date => {
  const boundary = new Date(date);
  boundary.setHours(23, 59, 59, 999);
  return boundary;
};

const isSameLocalDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

/** Converts a calendar selection into the exact UTC instants sent to GraphQL. */
export const normalizeTaskDateRange = (
  from: Date,
  to?: Date
): TaskDateRange => ({
  from: startOfLocalDay(from),
  to: endOfLocalDay(to ?? from),
});

export const emptyTaskCommittedFilters = (): TaskCommittedFilters =>
  EMPTY_COMMITTED_FILTERS;

export const toTaskCommittedFilters = (
  parsed: ParsedTaskFilterParams
): TaskCommittedFilters => ({
  createdFrom: parsed.createdFrom,
  createdTo: parsed.createdTo,
  search: parsed.committedSearch,
});

export const toTaskFilterQueryVariables = (
  filters: TaskCommittedFilters
): TaskFilterQueryVariables => {
  const queryVariables: TaskFilterQueryVariables = {};

  if (filters.search.length > 0) {
    queryVariables.search = filters.search;
  }

  if (filters.createdFrom !== undefined) {
    queryVariables.createdFrom = filters.createdFrom.toISOString();
  }

  if (filters.createdTo !== undefined) {
    queryVariables.createdTo = filters.createdTo.toISOString();
  }

  return queryVariables;
};

/** Writes filter params onto an existing URLSearchParams, preserving unrelated keys. */
export const applyTaskFilterSearchParams = (
  params: URLSearchParams,
  filters: TaskCommittedFilters
): void => {
  if (filters.search.length > 0) {
    params.set(SEARCH_PARAM, filters.search);
  } else {
    params.delete(SEARCH_PARAM);
  }

  if (filters.createdFrom === undefined) {
    params.delete(CREATED_FROM_PARAM);
  } else {
    params.set(CREATED_FROM_PARAM, filters.createdFrom.toISOString());
  }

  if (filters.createdTo === undefined) {
    params.delete(CREATED_TO_PARAM);
  } else {
    params.set(CREATED_TO_PARAM, filters.createdTo.toISOString());
  }
};

/** Calendar `selected` range: single-day selections omit `to` for UI display. */
export const toTaskFilterDateRange = (
  filters: TaskCommittedFilters
): DateRange | undefined => {
  const { createdFrom, createdTo } = filters;

  if (createdFrom === undefined && createdTo === undefined) {
    return;
  }

  return {
    from: createdFrom,
    to:
      createdFrom !== undefined &&
      createdTo !== undefined &&
      isSameLocalDay(createdFrom, createdTo)
        ? undefined
        : createdTo,
  };
};

export const parseTaskFilterParams = (
  params: TaskFilterParamValues
): ParsedTaskFilterParams => {
  const committedSearch = firstValue(params.search)?.trim() ?? "";
  let createdFrom = parseDate(params.createdFrom);
  let createdTo = parseDate(params.createdTo);

  if (
    createdFrom !== undefined &&
    createdTo !== undefined &&
    createdFrom.getTime() > createdTo.getTime()
  ) {
    createdFrom = undefined;
    createdTo = undefined;
  }

  const filters: TaskCommittedFilters = {
    createdFrom,
    createdTo,
    search: committedSearch,
  };

  return {
    committedSearch,
    createdFrom,
    createdTo,
    queryVariables: toTaskFilterQueryVariables(filters),
  };
};
