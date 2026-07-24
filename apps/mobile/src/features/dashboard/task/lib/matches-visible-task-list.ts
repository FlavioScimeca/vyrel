import type { VariablesOf } from "gql.tada";

import type { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import type { OptimisticTaskExisting } from "@/features/dashboard/task/graphql/types";
import { hasAnyDefined } from "@/utils/has-any-defined";

export type ListTasksVariables = VariablesOf<typeof ListTasksDocument>;

type OptimisticTaskFields = Pick<
  OptimisticTaskExisting,
  "description" | "title"
>;

const UNKNOWN_FILTER_KEYS = [
  "createdFrom",
  "createdTo",
] as const satisfies readonly (keyof ListTasksVariables)[];

const SEARCHABLE_TASK_FIELDS = [
  "title",
  "description",
] as const satisfies readonly (keyof OptimisticTaskFields)[];

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

const matchesTextSearch = (
  search: string,
  values: readonly (string | null | undefined)[]
): boolean => {
  const needle = search.toLowerCase();
  return values.some((value) => (value ?? "").toLowerCase().includes(needle));
};
