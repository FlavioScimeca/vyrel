"use client";

import { useCollectionQuery } from "@vyrel/graphql-client";
import { type ReactNode, useCallback, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/features/dashboard/task/components/create-task-dialog";
import { TaskFilters } from "@/features/dashboard/task/components/task-filters";
import { TaskList } from "@/features/dashboard/task/components/task-list";
import { TaskListProvider } from "@/features/dashboard/task/context/task-list-context";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import {
  matchesTaskFilters,
  useTaskFilters,
} from "@/features/dashboard/task/hooks/use-task-filters";
import type { TaskCommittedFilters } from "@/features/dashboard/task/lib/task-filter-params";
import { authClient } from "@/lib/auth-client";

type TasksScreenProps = {
  initialFilters: TaskCommittedFilters;
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
  onClearFilters,
  onRetry,
  tasks,
}: {
  errorMessage?: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  tasks: readonly TaskListItemRef[];
}) {
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

function TasksWithOrganization({
  initialFilters,
  organizationId,
}: {
  initialFilters: TaskCommittedFilters;
  organizationId: string;
}) {
  const {
    clearFilters,
    createdRange,
    hasActiveFilters,
    hasCommittedFilters,
    queryVariables,
    search,
    setCreatedRange,
    setSearch,
  } = useTaskFilters(initialFilters);

  const { collection, data, error, refetch } = useCollectionQuery(
    ListTasksDocument,
    {
      fetchPolicy: hasCommittedFilters ? "cache-and-network" : "cache-first",
      errorPolicy: "all",
      matches: matchesTaskFilters,
      variables: { organizationId, ...queryVariables },
    }
  );
  const [, startRefreshTransition] = useTransition();
  const refreshTasks = useCallback((): void => {
    startRefreshTransition(async () => {
      try {
        await refetch();
      } catch {
        // Apollo exposes the failure through the query `error` state.
      }
    });
  }, [refetch]);
  const tasks = data?.tasks ?? [];

  return (
    <TaskListProvider collection={collection} refreshTasks={refreshTasks}>
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
          onClearFilters={clearFilters}
          onRetry={refreshTasks}
          tasks={tasks}
        />
      </div>
    </TaskListProvider>
  );
}

export default function TasksScreen({
  initialFilters,
  initialOrganizationId,
}: TasksScreenProps) {
  const { data: sessionData, isPending: isSessionPending } =
    authClient.useSession();
  // The server value bridges hydration only. Once the client session resolves,
  // null must remain null instead of reviving a stale organization id.
  const organizationId = isSessionPending
    ? initialOrganizationId
    : (sessionData?.session.activeOrganizationId ?? null);
  const hasOrganization = organizationId !== null && organizationId.length > 0;

  if (hasOrganization) {
    return (
      <TasksWithOrganization
        initialFilters={initialFilters}
        organizationId={organizationId}
      />
    );
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
