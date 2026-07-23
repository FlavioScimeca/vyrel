"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

import type { ListTasksVariables } from "@/features/dashboard/task/lib/matches-visible-task-list";

type TaskListScope = {
  readonly listVariables: ListTasksVariables;
};

const TaskListScopeContext = createContext<TaskListScope | undefined>(
  undefined
);

type TaskListScopeProviderProps = PropsWithChildren<{
  listVariables: ListTasksVariables;
}>;

export function TaskListScopeProvider({
  children,
  listVariables,
}: TaskListScopeProviderProps) {
  return (
    <TaskListScopeContext.Provider value={{ listVariables }}>
      {children}
    </TaskListScopeContext.Provider>
  );
}

export function useTaskListVariables(): ListTasksVariables {
  const scope = useContext(TaskListScopeContext);
  if (scope === undefined) {
    throw new Error(
      "useTaskListVariables must be used within TaskListScopeProvider."
    );
  }
  return scope.listVariables;
}
