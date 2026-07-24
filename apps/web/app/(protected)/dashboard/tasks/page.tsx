import { redirect } from "next/navigation";
import { Suspense } from "react";

import { TasksListSkeleton } from "@/features/dashboard/task/components/tasks-list-skeleton";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import TasksScreen from "@/features/dashboard/task/screen/tasks";
import { PreloadQuery } from "@/graphql/apollo/client";
import { getServerAuthState } from "@/lib/server-session";

export default async function TasksPage() {
  const authState = await getServerAuthState();
  const organizationId = authState?.activeOrganizationId;

  if (organizationId === null || organizationId === undefined) {
    redirect("/onboarding");
  }

  return (
    <PreloadQuery query={ListTasksDocument} variables={{ organizationId }}>
      <Suspense fallback={<TasksListSkeleton />}>
        <TasksScreen organizationId={organizationId} />
      </Suspense>
    </PreloadQuery>
  );
}
