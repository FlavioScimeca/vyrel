import type { ApolloCache } from "@apollo/client";
import { readFragment } from "gql.tada";

import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import type {
  ListTasksData,
  ListTasksItem,
  OptimisticTaskInput,
  TaskListItemRef,
} from "@/features/dashboard/task/graphql/types";

type ModifyTaskList = (tasks: readonly ListTasksItem[]) => ListTasksItem[];

function readTaskId(item: ListTasksItem): string {
  return readFragment(TaskListItemFragment, item).id;
}

function modifyTaskList(
  cache: ApolloCache,
  organizationId: string,
  modify: ModifyTaskList
): void {
  cache.updateQuery(
    {
      query: ListTasksDocument,
      variables: { organizationId },
    },
    (data: ListTasksData | null | undefined) => {
      if (data === null || data === undefined) {
        return data;
      }

      return {
        ...data,
        tasks: modify(data.tasks),
      };
    }
  );
}

/** Build a temporary TaskListItem-shaped object for optimistic UI. */
export function buildOptimisticTask(
  input: OptimisticTaskInput
): TaskListItemRef {
  const now = new Date().toISOString();

  return {
    __typename: "Task",
    createdAt: now,
    description: input.description ?? null,
    id: input.id ?? `optimistic-${crypto.randomUUID()}`,
    imageFull: input.imageFull ?? null,
    imageThumb: input.imageThumb ?? null,
    title: input.title,
    updatedAt: now,
  } as unknown as TaskListItemRef;
}

export function prependTaskToList(
  cache: ApolloCache,
  organizationId: string,
  task: ListTasksItem
): void {
  modifyTaskList(cache, organizationId, (tasks) => [task, ...tasks]);
}

export function updateTaskInList(
  cache: ApolloCache,
  organizationId: string,
  task: ListTasksItem
): void {
  const updatedId = readTaskId(task);

  modifyTaskList(cache, organizationId, (tasks) =>
    tasks.map((existing) =>
      readTaskId(existing) === updatedId ? task : existing
    )
  );
}

export function removeTaskFromList(
  cache: ApolloCache,
  organizationId: string,
  taskId: string
): void {
  modifyTaskList(cache, organizationId, (tasks) =>
    tasks.filter((existing) => readTaskId(existing) !== taskId)
  );

  const normalizedId = cache.identify({ __typename: "Task", id: taskId });
  if (normalizedId !== undefined) {
    cache.evict({ id: normalizedId });
    cache.gc();
  }
}
