"use client";

import { useQuery } from "@apollo/client/react";
import { useCallback } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { CreateTaskDialog } from "@/features/dashboard/task/components/create-task-dialog";
import { TaskList } from "@/features/dashboard/task/components/task-list";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import { authClient } from "@/lib/auth-client";

export default function TasksScreen() {
  const { data: sessionData, isPending: sessionPending } =
    authClient.useSession();
  const organizationId = sessionData?.session.activeOrganizationId ?? null;

  const { data, error, loading, refetch } = useQuery(ListTasksDocument, {
    skip: organizationId === null || organizationId.length === 0,
    variables: {
      organizationId: organizationId ?? "",
    },
  });

  const handleTaskChanged = useCallback(() => {
    refetch();
  }, [refetch]);

  const tasks = data?.tasks ?? [];
  const isLoading = sessionPending || (organizationId !== null && loading);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Track work for your active organization.
          </p>
        </div>
        {organizationId !== null && organizationId.length > 0 ? (
          <CreateTaskDialog
            onCreated={handleTaskChanged}
            organizationId={organizationId}
          />
        ) : null}
      </header>

      {organizationId === null || organizationId.length === 0 ? (
        <Alert>
          <AlertDescription>
            Select an active organization to view and create tasks.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : null}

      {!isLoading &&
      organizationId !== null &&
      organizationId.length > 0 &&
      error !== undefined ? (
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load tasks. Please try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading &&
      organizationId !== null &&
      organizationId.length > 0 &&
      error === undefined ? (
        <TaskList onChanged={handleTaskChanged} tasks={tasks} />
      ) : null}
    </div>
  );
}
