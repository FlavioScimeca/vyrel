"use client";

import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import {
  CreateTaskDocument,
  DeleteTaskDocument,
  UpdateTaskDocument,
} from "@/features/dashboard/task/graphql/mutations";
import {
  buildOptimisticTask,
  prependTaskToList,
  removeTaskFromList,
  updateTaskInList,
} from "@/features/dashboard/task/graphql/task-cache";
import type { OptimisticTaskExisting } from "@/features/dashboard/task/graphql/types";

export function useCreateTaskMutation(organizationId: string) {
  return useMutation(CreateTaskDocument, {
    onCompleted: () => {
      toast.success("Task created");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to create task.");
    },
    optimisticResponse: (variables) => ({
      createTask: buildOptimisticTask({
        description: variables.input.description ?? null,
        title: variables.input.title,
      }),
    }),
    update: (cache, result) => {
      const task = result.data?.createTask;
      if (task === null || task === undefined) {
        return;
      }

      prependTaskToList(cache, organizationId, task);
    },
  });
}

export function useUpdateTaskMutation(
  organizationId: string,
  existingTask: OptimisticTaskExisting
) {
  return useMutation(UpdateTaskDocument, {
    onCompleted: () => {
      toast.success("Task updated");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to update task.");
    },
    optimisticResponse: (variables) => ({
      updateTask: buildOptimisticTask({
        description:
          variables.input.description === undefined
            ? existingTask.description
            : (variables.input.description ?? null),
        id: existingTask.id,
        imageFull: existingTask.imageFull,
        imageThumb: existingTask.imageThumb,
        title: variables.input.title ?? existingTask.title,
      }),
    }),
    update: (cache, result) => {
      const task = result.data?.updateTask;
      if (task === null || task === undefined) {
        return;
      }

      updateTaskInList(cache, organizationId, task);
    },
  });
}

export function useDeleteTaskMutation(organizationId: string) {
  return useMutation(DeleteTaskDocument, {
    onCompleted: () => {
      toast.success("Task deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to delete task.");
    },
    optimisticResponse: (variables) => ({
      deleteTask: variables.input.taskId,
    }),
    update: (cache, _result, options) => {
      const taskId = options.variables?.input.taskId;
      if (taskId === undefined || taskId.length === 0) {
        return;
      }

      removeTaskFromList(cache, organizationId, taskId);
    },
  });
}
