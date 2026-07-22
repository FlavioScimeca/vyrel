import { Suspense } from "react";

import Sidebar02 from "@/components/sidebar-02";
import { DashboardShellSkeleton } from "@/components/sidebar-02/dashboard-shell-skeleton";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";
import { PreloadQuery } from "@/graphql/apollo/client";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PreloadQuery query={ListOrganizationsDocument}>
      <Suspense fallback={<DashboardShellSkeleton />}>
        <Sidebar02>{children}</Sidebar02>
      </Suspense>
    </PreloadQuery>
  );
}
