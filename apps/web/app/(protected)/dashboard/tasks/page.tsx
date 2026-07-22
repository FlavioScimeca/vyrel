import { Suspense } from "react";

import { TasksListSkeleton } from "@/features/dashboard/task/components/tasks-list-skeleton";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import {
  emptyTaskCommittedFilters,
  parseTaskFilterParams,
  toTaskCommittedFilters,
} from "@/features/dashboard/task/lib/task-filter-params";
import TasksScreen from "@/features/dashboard/task/screen/tasks";
import { PreloadQuery } from "@/graphql/apollo/client";
import { getServerSession } from "@/lib/server-session";

type TasksPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const [session, routeSearchParams] = await Promise.all([
    getServerSession(),
    searchParams,
  ]);
  const organizationId = session?.session?.activeOrganizationId ?? null;

  if (organizationId === null || organizationId.length === 0) {
    return (
      <TasksScreen
        initialFilters={emptyTaskCommittedFilters()}
        initialOrganizationId={null}
      />
    );
  }

  const parsed = parseTaskFilterParams({
    createdFrom: routeSearchParams.createdFrom,
    createdTo: routeSearchParams.createdTo,
    search: routeSearchParams.search,
  });
  const initialFilters = toTaskCommittedFilters(parsed);

  return (
    <PreloadQuery
      query={ListTasksDocument}
      variables={{ organizationId, ...parsed.queryVariables }}
    >
      <Suspense fallback={<TasksListSkeleton />}>
        <TasksScreen
          initialFilters={initialFilters}
          initialOrganizationId={organizationId}
        />
      </Suspense>
    </PreloadQuery>
  );
}
