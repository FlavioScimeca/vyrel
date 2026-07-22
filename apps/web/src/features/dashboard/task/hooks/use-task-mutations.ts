"use client";

import {
  collectionOverrideWhen,
  removeFromCollectionVariant,
  useOptimisticCreate,
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { toast } from "sonner";
import { useTaskListVariables } from "@/features/dashboard/task/context/task-refresh-context";
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

export function useCreateTaskMutation() {
  const listVariables = useTaskListVariables();

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
  const listVariables = useTaskListVariables();

  return useOptimisticUpdate(UpdateTaskDocument, {
    current: existingTask,
    onCompleted: () => {
      toast.success("Task updated");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to update task.");
    },
    optimistic: (variables) => ({
      description:
        variables.input.description === undefined
          ? existingTask.description
          : (variables.input.description ?? null),
      title: variables.input.title ?? existingTask.title,
    }),
    update: (cache, _result, { variables }) => {
      if (variables === undefined) {
        return;
      }

      const nextTask = {
        description:
          variables.input.description === undefined
            ? existingTask.description
            : (variables.input.description ?? null),
        title: variables.input.title ?? existingTask.title,
      };

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
  return useOptimisticDelete(DeleteTaskDocument, {
    id: (variables) => variables.input.taskId,
    onCompleted: () => {
      toast.success("Task deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to delete task.");
    },
  });
}
