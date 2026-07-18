import type { ApolloCache } from "@apollo/client";
import { readFragment } from "gql.tada";

import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";

type OptimisticTaskInput = {
  description?: string | null;
  id?: string;
  imageFull?: string | null;
  imageThumb?: string | null;
  title: string;
};

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
  task: TaskListItemRef
): void {
  cache.updateQuery(
    {
      query: ListTasksDocument,
      variables: { organizationId },
    },
    (data) => {
      if (data === null || data === undefined) {
        return data;
      }

      return {
        ...data,
        tasks: [task, ...data.tasks],
      };
    }
  );
}

export function updateTaskInList(
  cache: ApolloCache,
  organizationId: string,
  task: TaskListItemRef
): void {
  const updated = readFragment(TaskListItemFragment, task);

  cache.updateQuery(
    {
      query: ListTasksDocument,
      variables: { organizationId },
    },
    (data) => {
      if (data === null || data === undefined) {
        return data;
      }

      return {
        ...data,
        tasks: data.tasks.map((existing) => {
          const item = readFragment(TaskListItemFragment, existing);
          return item.id === updated.id ? task : existing;
        }),
      };
    }
  );
}

export function removeTaskFromList(
  cache: ApolloCache,
  organizationId: string,
  taskId: string
): void {
  cache.updateQuery(
    {
      query: ListTasksDocument,
      variables: { organizationId },
    },
    (data) => {
      if (data === null || data === undefined) {
        return data;
      }

      return {
        ...data,
        tasks: data.tasks.filter((existing) => {
          const item = readFragment(TaskListItemFragment, existing);
          return item.id !== taskId;
        }),
      };
    }
  );

  const normalizedId = cache.identify({ __typename: "Task", id: taskId });
  if (normalizedId !== undefined) {
    cache.evict({ id: normalizedId });
    cache.gc();
  }
}
