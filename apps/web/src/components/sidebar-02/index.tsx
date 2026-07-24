"use client";

import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Sidebar02({
  activeOrganizationId,
  children,
}: {
  activeOrganizationId: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex h-dvh w-full">
        <DashboardSidebar activeOrganizationId={activeOrganizationId} />
        <SidebarInset className="flex flex-col">{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
