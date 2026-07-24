import {
  collectionOverrideWhen,
  removeFromCollectionVariant,
  useOptimisticCreate,
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import type { VariablesOf } from "gql.tada";
import { useToast } from "heroui-native";

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
  const { toast } = useToast();

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
      toast.show({ label: "Task created", variant: "success" });
    },
    onError: (error) => {
      toast.show({
        label: error.message || "Unable to create task.",
        variant: "danger",
      });
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
  const { toast } = useToast();

  return useOptimisticUpdate(UpdateTaskDocument, {
    current: existingTask,
    onCompleted: () => {
      toast.show({ label: "Task updated", variant: "success" });
    },
    onError: (error) => {
      toast.show({
        label: error.message || "Unable to update task.",
        variant: "danger",
      });
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
  const { toast } = useToast();

  return useOptimisticDelete(DeleteTaskDocument, {
    id: (variables) => variables.input.taskId,
    identity,
    onCompleted: () => {
      toast.show({ label: "Task deleted", variant: "success" });
    },
    onError: (error) => {
      toast.show({
        label: error.message || "Unable to delete task.",
        variant: "danger",
      });
    },
  });
}
