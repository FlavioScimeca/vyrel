import { redirect } from "next/navigation";
import { Suspense } from "react";

import Sidebar02 from "@/components/sidebar-02";
import { DashboardShellSkeleton } from "@/components/sidebar-02/dashboard-shell-skeleton";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";
import { PreloadQuery } from "@/graphql/apollo/client";
import { getServerAuthState } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authState = await getServerAuthState();

  if (authState === null) {
    redirect("/auth");
  }

  if (authState.activeOrganizationId === null) {
    redirect("/onboarding");
  }

  return (
    <PreloadQuery query={ListOrganizationsDocument}>
      <Suspense fallback={<DashboardShellSkeleton />}>
        <Sidebar02 activeOrganizationId={authState.activeOrganizationId}>
          {children}
        </Sidebar02>
      </Suspense>
    </PreloadQuery>
  );
}
