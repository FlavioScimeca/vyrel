"use client";

import {
  useOptimisticCreate,
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { toast } from "sonner";
import {
  CreateTaskDocument,
  DeleteTaskDocument,
  UpdateTaskDocument,
} from "@/features/dashboard/task/graphql/mutations";
import type { OptimisticTaskExisting } from "@/features/dashboard/task/graphql/types";

export function useCreateTaskMutation() {
  return useOptimisticCreate(CreateTaskDocument, {
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
