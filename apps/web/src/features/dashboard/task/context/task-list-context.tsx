"use client";

import type { CollectionHandle } from "@vyrel/graphql-client";
import { createContext, type PropsWithChildren, use, useMemo } from "react";

import type { TaskListItemData } from "@/features/dashboard/task/graphql/types";

type TaskListContextValue = {
  readonly collection: CollectionHandle<TaskListItemData>;
  readonly refreshTasks: () => void;
};

const TaskListContext = createContext<TaskListContextValue | undefined>(
  undefined
);

type TaskListProviderProps = PropsWithChildren<TaskListContextValue>;

export function TaskListProvider({
  children,
  collection,
  refreshTasks,
}: TaskListProviderProps) {
  const value = useMemo(
    () => ({ collection, refreshTasks }),
    [collection, refreshTasks]
  );

  return <TaskListContext value={value}>{children}</TaskListContext>;
}

export function useTaskListContext(): TaskListContextValue {
  const context = use(TaskListContext);
  if (context === undefined) {
    throw new Error("useTaskListContext must be used within TaskListProvider.");
  }
  return context;
}
