"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

import type { ListTasksVariables } from "@/features/dashboard/task/lib/matches-visible-task-list";

type RefreshTasks = () => Promise<void>;

type TaskListScope = {
  readonly listVariables: ListTasksVariables;
  readonly refreshTasks: RefreshTasks;
};

const TaskListScopeContext = createContext<TaskListScope | undefined>(
  undefined
);

type TaskRefreshProviderProps = PropsWithChildren<{
  listVariables: ListTasksVariables;
  refreshTasks: RefreshTasks;
}>;

export function TaskRefreshProvider({
  children,
  listVariables,
  refreshTasks,
}: TaskRefreshProviderProps) {
  return (
    <TaskListScopeContext.Provider value={{ listVariables, refreshTasks }}>
      {children}
    </TaskListScopeContext.Provider>
  );
}

function useTaskListScope(): TaskListScope {
  const scope = useContext(TaskListScopeContext);
  if (scope === undefined) {
    throw new Error(
      "Task list scope hooks must be used within TaskRefreshProvider."
    );
  }
  return scope;
}

export function useRefreshTasks(): RefreshTasks {
  return useTaskListScope().refreshTasks;
}

export function useTaskListVariables(): ListTasksVariables {
  return useTaskListScope().listVariables;
}
