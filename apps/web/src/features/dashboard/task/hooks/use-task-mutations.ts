"use client";

import {
  collectionOverrideWhen,
  removeFromCollectionVariant,
  useOptimisticCreate,
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { toast } from "@vyrel/shared/ui";
import type { VariablesOf } from "gql.tada";
import { useTaskListScope } from "@/features/dashboard/task/context/task-list-scope";
import {
  CreateTaskDocument,
  DeleteTaskDocument,
  UpdateTaskDocument,
} from "@/features/dashboard/task/graphql/mutations";
import type { OptimisticTaskExisting } from "@/features/dashboard/task/graphql/types";
import {
  shouldRemoveFromVisibleFilteredList,
  taskBelongsToVisibleList,
} from "@/features/dashboard/task/lib/matches-visible-task-list";
import { ListTasksDocument } from "../graphql/queries";

type UpdateTaskVariables = VariablesOf<typeof UpdateTaskDocument>;
type OptimisticTaskPatch = Pick<
  OptimisticTaskExisting,
  "description" | "title"
>;

const buildOptimisticTaskPatch = (
  variables: UpdateTaskVariables,
  existingTask: OptimisticTaskExisting
): OptimisticTaskPatch => ({
  description:
    variables.input.description === undefined
      ? existingTask.description
      : (variables.input.description ?? null),
  title: variables.input.title ?? existingTask.title,
});

export function useCreateTaskMutation() {
  const { identity, listVariables } = useTaskListScope();

  return useOptimisticCreate(CreateTaskDocument, {
    collection: ({ input }) =>
      collectionOverrideWhen({
        query: ListTasksDocument,
        variables: listVariables,
        when: taskBelongsToVisibleList(
          {
            description: input.description ?? null,
            title: input.title,
          },
          listVariables
        ),
      }),
    identity,
    onCompleted: () => {
      toast.success("Task created");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to create task.");
    },
    optimistic: (variables) => ({
      description: variables.input.description ?? null,
      imageFull: null,
      imageThumb: null,
      title: variables.input.title,
    }),
  });
}

export function useUpdateTaskMutation(existingTask: OptimisticTaskExisting) {
  const { listVariables } = useTaskListScope();

  return useOptimisticUpdate(UpdateTaskDocument, {
    current: existingTask,
    onCompleted: () => {
      toast.success("Task updated");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to update task.");
    },
    optimistic: (variables) =>
      buildOptimisticTaskPatch(variables, existingTask),
    update: (cache, _result, { variables }) => {
      if (variables === undefined) {
        return;
      }

      const nextTask = buildOptimisticTaskPatch(variables, existingTask);

      if (!shouldRemoveFromVisibleFilteredList(nextTask, listVariables)) {
        return;
      }

      removeFromCollectionVariant(cache, {
        keyValue: existingTask.id,
        query: ListTasksDocument,
        variables: listVariables,
      });
    },
  });
}

export function useDeleteTaskMutation() {
  const { identity } = useTaskListScope();

  return useOptimisticDelete(DeleteTaskDocument, {
    id: (variables) => variables.input.taskId,
    identity,
    onCompleted: () => {
      toast.success("Task deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to delete task.");
    },
  });
}
