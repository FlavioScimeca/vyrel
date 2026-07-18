import { Suspense } from "react";

import { TasksListSkeleton } from "@/features/dashboard/task/components/tasks-list-skeleton";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import TasksScreen from "@/features/dashboard/task/screen/tasks";
import { PreloadQuery } from "@/graphql/apollo/client";
import { getServerSession } from "@/lib/server-session";

export default async function TasksPage() {
  const session = await getServerSession();
  const organizationId = session?.session?.activeOrganizationId ?? null;

  if (organizationId === null || organizationId.length === 0) {
    return <TasksScreen initialOrganizationId={null} />;
  }

  return (
    <PreloadQuery query={ListTasksDocument} variables={{ organizationId }}>
      <Suspense fallback={<TasksListSkeleton />}>
        <TasksScreen initialOrganizationId={organizationId} />
      </Suspense>
    </PreloadQuery>
  );
}
