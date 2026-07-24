import type { FragmentOf, ResultOf } from "gql.tada";

import type { TaskListItemFragment } from "./fragments";

export type TaskListItemRef = FragmentOf<typeof TaskListItemFragment>;
type TaskListItemData = ResultOf<typeof TaskListItemFragment>;

export type OptimisticTaskExisting = TaskListItemData;
