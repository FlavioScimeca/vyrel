"use client";

import { useQuery } from "@apollo/client/react";
import { type ReactNode, useCallback } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/features/dashboard/task/components/create-task-dialog";
import { TaskFilters } from "@/features/dashboard/task/components/task-filters";
import { TaskList } from "@/features/dashboard/task/components/task-list";
import { TasksListSkeleton } from "@/features/dashboard/task/components/tasks-list-skeleton";
import { TaskRefreshProvider } from "@/features/dashboard/task/context/task-refresh-context";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { useTaskFilters } from "@/features/dashboard/task/hooks/use-task-filters";
import { authClient } from "@/lib/auth-client";

type TasksScreenProps = {
  initialOrganizationId: string | null;
};

function TasksListErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        <Button onClick={onRetry} size="sm" variant="outline">
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function TasksListPanel({
  errorMessage,
  hasActiveFilters,
  loading,
  onClearFilters,
  onRetry,
  tasks,
}: {
  errorMessage?: string;
  hasActiveFilters: boolean;
  loading: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  tasks: readonly TaskListItemRef[];
}) {
  if (loading && tasks.length === 0) {
    return <TasksListSkeleton />;
  }

  if (errorMessage !== undefined) {
    return <TasksListErrorFallback message={errorMessage} onRetry={onRetry} />;
  }

  return (
    <TaskList
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
      tasks={tasks}
    />
  );
}

function TasksHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl tracking-tight">Tasks</h1>
        <p className="text-muted-foreground text-sm">
          Track work for your active organization.
        </p>
      </div>
      {action}
    </header>
  );
}

function TasksWithOrganization({ organizationId }: { organizationId: string }) {
  const {
    clearFilters,
    createdRange,
    hasActiveFilters,
    queryVariables,
    search,
    setCreatedRange,
    setSearch,
  } = useTaskFilters();
  const { data, error, loading, refetch } = useQuery(ListTasksDocument, {
    variables: { organizationId, ...queryVariables },
  });
  const refreshTasks = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);
  const handleRetry = useCallback(() => {
    refreshTasks().catch(() => {
      // Error surfaces via the query `error` state.
    });
  }, [refreshTasks]);

  return (
    <TaskRefreshProvider refreshTasks={refreshTasks}>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <TasksHeader
          action={<CreateTaskDialog organizationId={organizationId} />}
        />
        <TaskFilters
          clearFilters={clearFilters}
          createdRange={createdRange}
          hasActiveFilters={hasActiveFilters}
          onCreatedRangeChange={setCreatedRange}
          onSearchChange={setSearch}
          search={search}
        />
        <TasksListPanel
          errorMessage={
            error === undefined
              ? undefined
              : error.message || "Unable to load tasks. Please try again."
          }
          hasActiveFilters={hasActiveFilters}
          loading={loading}
          onClearFilters={clearFilters}
          onRetry={handleRetry}
          tasks={data?.tasks ?? []}
        />
      </div>
    </TaskRefreshProvider>
  );
}

export default function TasksScreen({
  initialOrganizationId,
}: TasksScreenProps) {
  const { data: sessionData } = authClient.useSession();
  const sessionOrgId = sessionData?.session.activeOrganizationId ?? null;
  const organizationId = sessionOrgId ?? initialOrganizationId;
  const hasOrganization = organizationId !== null && organizationId.length > 0;

  if (hasOrganization) {
    return <TasksWithOrganization organizationId={organizationId} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <TasksHeader />
      <Alert>
        <AlertDescription>
          Select an active organization to view and create tasks.
        </AlertDescription>
      </Alert>
    </div>
  );
}
