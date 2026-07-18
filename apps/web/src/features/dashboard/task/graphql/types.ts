import type { FragmentOf, ResultOf } from "gql.tada";

import type { TaskListItemFragment } from "./fragments";
import type { ListTasksDocument } from "./queries";

export type TaskListItemRef = FragmentOf<typeof TaskListItemFragment>;
type TaskListItemData = ResultOf<typeof TaskListItemFragment>;
export type ListTasksData = ResultOf<typeof ListTasksDocument>;
export type ListTasksItem = ListTasksData["tasks"][number];

/** Fields needed to build an optimistic list item (create or update). */
export type OptimisticTaskInput = Partial<
  Pick<TaskListItemData, "id" | "description" | "imageFull" | "imageThumb">
> &
  Pick<TaskListItemData, "title">;

/** Existing task fields merged into an optimistic update. */
export type OptimisticTaskExisting = Pick<
  TaskListItemData,
  "id" | "title" | "description" | "imageFull" | "imageThumb"
>;
