"use client";

import {
  createOptimisticListIdentity,
  type OptimisticListIdentity,
} from "@vyrel/graphql-client";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ListTasksVariables } from "@/features/dashboard/task/lib/matches-visible-task-list";

type TaskListScope = {
  readonly identity: OptimisticListIdentity;
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
  const [identity] = useState(createOptimisticListIdentity);
  const scope = useMemo(
    () => ({ identity, listVariables }),
    [identity, listVariables]
  );

  useEffect(
    () => () => {
      identity.clear();
    },
    [identity]
  );

  return (
    <TaskListScopeContext.Provider value={scope}>
      {children}
    </TaskListScopeContext.Provider>
  );
}

export function useTaskListScope(): TaskListScope {
  const scope = useContext(TaskListScopeContext);
  if (scope === undefined) {
    throw new Error(
      "useTaskListScope must be used within TaskListScopeProvider."
    );
  }
  return scope;
}
