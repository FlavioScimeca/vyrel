"use client";

import { IconChecklist, IconHome, IconWallet } from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@vyrel/shared/ui";
import { LazyMotion, m } from "motion/react";
import type { Route } from "@/components/sidebar-02/nav-main";
import DashboardNavigation from "@/components/sidebar-02/nav-main";
import { NavManagement } from "@/components/sidebar-02/nav-management";
import { NotificationsPopover } from "@/components/sidebar-02/nav-notifications";
import { OrganizationSwitcher } from "@/components/sidebar-02/organization-switcher";
import { loadMotionDomAnimation } from "@/lib/motion-features";
import { cn } from "@/lib/utils";

const sampleNotifications = [
  {
    id: "1",
    avatar: "/avatars/01.png",
    fallback: "OM",
    text: "New order received.",
    time: "10m ago",
  },
  {
    id: "2",
    avatar: "/avatars/02.png",
    fallback: "JL",
    text: "Server upgrade completed.",
    time: "1h ago",
  },
  {
    id: "3",
    avatar: "/avatars/03.png",
    fallback: "HH",
    text: "New user signed up.",
    time: "2h ago",
  },
];

const dashboardRoutes: Route[] = [
  {
    id: "home",
    title: "Home",
    icon: <IconHome className="size-4" />,
    link: "/dashboard",
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: <IconChecklist className="size-4" />,
    link: "/dashboard/tasks",
  },
  {
    id: "finance",
    title: "Finance",
    icon: <IconWallet className="size-4" />,
    link: "#",
    subs: [
      { title: "Incoming", link: "#" },
      { title: "Outgoing", link: "#" },
      { title: "Payout Account", link: "#" },
    ],
  },
];

export function DashboardSidebar({
  activeOrganizationId,
}: {
  activeOrganizationId: string;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between"
        )}
      >
        <OrganizationSwitcher activeOrganizationId={activeOrganizationId} />

        <LazyMotion features={loadMotionDomAnimation} strict>
          <m.div
            animate={{ opacity: 1 }}
            className={cn(
              "flex items-center gap-2",
              isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row"
            )}
            initial={{ opacity: 0 }}
            key={isCollapsed ? "header-collapsed" : "header-expanded"}
            transition={{ duration: 0.8 }}
          >
            <NotificationsPopover notifications={sampleNotifications} />
            <SidebarTrigger />
          </m.div>
        </LazyMotion>
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={dashboardRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <NavManagement />
      </SidebarFooter>
    </Sidebar>
  );
}
