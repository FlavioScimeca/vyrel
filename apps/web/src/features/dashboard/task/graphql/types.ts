import type { FragmentOf, ResultOf } from "gql.tada";

import type { TaskListItemFragment } from "./fragments";

export type TaskListItemRef = FragmentOf<typeof TaskListItemFragment>;
type TaskListItemData = ResultOf<typeof TaskListItemFragment>;

/** Existing task fields merged into an optimistic update. */
export type OptimisticTaskExisting = TaskListItemData;
