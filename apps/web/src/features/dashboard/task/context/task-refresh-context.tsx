"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

type RefreshTasks = () => Promise<void>;

const TaskRefreshContext = createContext<RefreshTasks | undefined>(undefined);

type TaskRefreshProviderProps = PropsWithChildren<{
  refreshTasks: RefreshTasks;
}>;

export function TaskRefreshProvider({
  children,
  refreshTasks,
}: TaskRefreshProviderProps) {
  return (
    <TaskRefreshContext.Provider value={refreshTasks}>
      {children}
    </TaskRefreshContext.Provider>
  );
}

export function useRefreshTasks(): RefreshTasks {
  const refreshTasks = useContext(TaskRefreshContext);
  if (refreshTasks === undefined) {
    throw new Error("useRefreshTasks must be used within TaskRefreshProvider.");
  }
  return refreshTasks;
}
