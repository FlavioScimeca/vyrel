import type { VariablesOf } from "gql.tada";

import type { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import type { OptimisticTaskExisting } from "@/features/dashboard/task/graphql/types";
import { hasAnyDefined } from "@/utils/has-any-defined";

export type ListTasksVariables = VariablesOf<typeof ListTasksDocument>;

/** Fields needed to evaluate optimistic list membership (from Task fragment). */
type OptimisticTaskFields = Pick<
  OptimisticTaskExisting,
  "description" | "title"
>;

/** Filters we cannot evaluate client-side with certainty (server day bounds). */
const UNKNOWN_FILTER_KEYS = [
  "createdFrom",
  "createdTo",
] as const satisfies readonly (keyof ListTasksVariables)[];

/** Task fields searched by the server `search` filter (title OR description). */
const SEARCHABLE_TASK_FIELDS = [
  "title",
  "description",
] as const satisfies readonly (keyof OptimisticTaskFields)[];

/**
 * Domain membership for the visible ListTasks filters.
 * Unknown filters (dates) → false (no optimistic dual-write).
 */
export function taskBelongsToVisibleList(
  task: OptimisticTaskFields,
  listVariables: ListTasksVariables
): boolean {
  if (hasAnyDefined(listVariables, UNKNOWN_FILTER_KEYS)) {
    return false;
  }

  const search = listVariables.search?.trim();
  if (search === undefined || search.length === 0) {
    return false;
  }

  return matchesTextSearch(
    search,
    SEARCHABLE_TASK_FIELDS.map((field) => task[field])
  );
}

/**
 * Whether an updated task should leave the currently visible filtered list.
 * Only when an evaluable search filter is active and the task no longer matches.
 */
export function shouldRemoveFromVisibleFilteredList(
  task: OptimisticTaskFields,
  listVariables: ListTasksVariables
): boolean {
  if (hasAnyDefined(listVariables, UNKNOWN_FILTER_KEYS)) {
    return false;
  }

  const search = listVariables.search?.trim();
  if (search === undefined || search.length === 0) {
    return false;
  }

  return !matchesTextSearch(
    search,
    SEARCHABLE_TASK_FIELDS.map((field) => task[field])
  );
}

/** Case-insensitive substring match over string/nullish values (universal). */
const matchesTextSearch = (
  search: string,
  values: readonly (string | null | undefined)[]
): boolean => {
  const needle = search.toLowerCase();
  return values.some((value) => (value ?? "").toLowerCase().includes(needle));
};
