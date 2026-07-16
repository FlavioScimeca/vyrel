"use client";

import {
  IconActivity,
  IconBuilding,
  IconChartPie,
  IconHome,
  IconIcons,
  IconInfinity,
  IconLink,
  IconPackage,
  IconPercentage,
  IconSettings,
  IconShoppingBag,
  IconSparkles,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { VyrelLogo } from "@/components/logo";
import type { Route } from "@/components/sidebar-02/nav-main";
import DashboardNavigation from "@/components/sidebar-02/nav-main";
import { NavManagement } from "@/components/sidebar-02/nav-management";
import { NotificationsPopover } from "@/components/sidebar-02/nav-notifications";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
    link: "#",
  },
  {
    id: "products",
    title: "Products",
    icon: <IconPackage className="size-4" />,
    link: "#",
    subs: [
      {
        title: "Catalogue",
        link: "#",
        icon: <IconPackage className="size-4" />,
      },
      {
        title: "Checkout Links",
        link: "#",
        icon: <IconLink className="size-4" />,
      },
      {
        title: "Discounts",
        link: "#",
        icon: <IconPercentage className="size-4" />,
      },
    ],
  },
  {
    id: "usage-billing",
    title: "Usage Billing",
    icon: <IconChartPie className="size-4" />,
    link: "#",
    subs: [
      {
        title: "Meters",
        link: "#",
        icon: <IconChartPie className="size-4" />,
      },
      {
        title: "Events",
        link: "#",
        icon: <IconActivity className="size-4" />,
      },
    ],
  },
  {
    id: "benefits",
    title: "Benefits",
    icon: <IconSparkles className="size-4" />,
    link: "#",
  },
  {
    id: "customers",
    title: "Customers",
    icon: <IconUsers className="size-4" />,
    link: "#",
  },
  {
    id: "sales",
    title: "Sales",
    icon: <IconShoppingBag className="size-4" />,
    link: "#",
    subs: [
      {
        title: "Orders",
        link: "#",
        icon: <IconShoppingBag className="size-4" />,
      },
      {
        title: "Subscriptions",
        link: "#",
        icon: <IconInfinity className="size-4" />,
      },
    ],
  },
  {
    id: "storefront",
    title: "Storefront",
    icon: <IconBuilding className="size-4" />,
    link: "#",
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: <IconTrendingUp className="size-4" />,
    link: "#",
  },
  {
    id: "finance",
    title: "Finance",
    icon: <IconIcons className="size-4" />,
    link: "#",
    subs: [
      { title: "Incoming", link: "#" },
      { title: "Outgoing", link: "#" },
      { title: "Payout Account", link: "#" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: <IconSettings className="size-4" />,
    link: "#",
    subs: [
      { title: "General", link: "#" },
      { title: "Webhooks", link: "#" },
      { title: "Custom Fields", link: "#" },
    ],
  },
];

export function DashboardSidebar() {
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
        <a className="flex items-center gap-2" href="/">
          <VyrelLogo className="h-8 w-8" />
          {!isCollapsed && (
            <span className="font-semibold text-black dark:text-white">
              Vyrel
            </span>
          )}
        </a>

        <motion.div
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
        </motion.div>
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
