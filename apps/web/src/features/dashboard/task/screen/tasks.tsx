"use client";

import { useQuery } from "@apollo/client/react";
import { useCallback } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/features/dashboard/task/components/create-task-dialog";
import { TaskList } from "@/features/dashboard/task/components/task-list";
import { TasksListSkeleton } from "@/features/dashboard/task/components/tasks-list-skeleton";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
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

function TasksListPanel({ organizationId }: { organizationId: string }) {
  const { data, error, loading, refetch } = useQuery(ListTasksDocument, {
    variables: { organizationId },
  });

  const handleRetry = useCallback(() => {
    refetch().catch(() => {
      // Error surfaces via the query `error` state.
    });
  }, [refetch]);

  if (loading && data === undefined) {
    return <TasksListSkeleton />;
  }

  if (error !== undefined) {
    return (
      <TasksListErrorFallback
        message={error.message || "Unable to load tasks. Please try again."}
        onRetry={handleRetry}
      />
    );
  }

  return <TaskList tasks={data?.tasks ?? []} />;
}

export default function TasksScreen({
  initialOrganizationId,
}: TasksScreenProps) {
  const { data: sessionData } = authClient.useSession();
  const sessionOrgId = sessionData?.session.activeOrganizationId ?? null;
  const organizationId = sessionOrgId ?? initialOrganizationId;
  const hasOrganization = organizationId !== null && organizationId.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Track work for your active organization.
          </p>
        </div>
        {hasOrganization ? (
          <CreateTaskDialog organizationId={organizationId} />
        ) : null}
      </header>

      {hasOrganization ? null : (
        <Alert>
          <AlertDescription>
            Select an active organization to view and create tasks.
          </AlertDescription>
        </Alert>
      )}

      {hasOrganization ? (
        <TasksListPanel key={organizationId} organizationId={organizationId} />
      ) : null}
    </div>
  );
}
