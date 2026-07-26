"use client";

import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@vyrel/shared/ui";
import type { Route as NextRoute } from "next";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type Route = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  link: string;
  subs?: {
    title: string;
    link: string;
    icon?: React.ReactNode;
  }[];
};

type CollapsibleRouteItemProps = {
  route: Route;
  isCollapsed: boolean;
  isOpen: boolean;
  onOpenChange: (routeId: string | null) => void;
};

function CollapsibleRouteItem({
  route,
  isCollapsed,
  isOpen,
  onOpenChange,
}: CollapsibleRouteItemProps) {
  const hasSubRoutes = !!route.subs?.length;

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open ? route.id : null);
  };

  return (
    <Collapsible
      className="w-full"
      onOpenChange={handleOpenChange}
      open={isOpen}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            className={cn(
              "flex w-full items-center rounded-lg px-2 transition-colors",
              isOpen
                ? "bg-sidebar-muted text-foreground"
                : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
              isCollapsed && "justify-center"
            )}
          />
        }
      >
        {route.icon}
        {!isCollapsed && (
          <span className="ml-2 flex-1 font-medium text-sm">{route.title}</span>
        )}
        {!isCollapsed && hasSubRoutes && (
          <span className="ml-auto">
            {isOpen ? (
              <IconChevronUp className="size-4" />
            ) : (
              <IconChevronDown className="size-4" />
            )}
          </span>
        )}
      </CollapsibleTrigger>

      {!isCollapsed && (
        <CollapsibleContent>
          <SidebarMenuSub className="my-1 ml-3.5">
            {route.subs?.map((subRoute) => (
              <SidebarMenuSubItem
                className="h-auto"
                key={`${route.id}-${subRoute.title}`}
              >
                <SidebarMenuSubButton
                  render={
                    <Link
                      className="flex items-center rounded-md px-4 py-1.5 font-medium text-muted-foreground text-sm hover:bg-sidebar-muted hover:text-foreground"
                      href={subRoute.link as NextRoute}
                      prefetch={true}
                    />
                  }
                >
                  {subRoute.title}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default function DashboardNavigation({ routes }: { routes: Route[] }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);

  return (
    <SidebarMenu>
      {routes.map((route) => {
        const isOpen = !isCollapsed && openCollapsible === route.id;
        const hasSubRoutes = !!route.subs?.length;

        return (
          <SidebarMenuItem key={route.id}>
            {hasSubRoutes ? (
              <CollapsibleRouteItem
                isCollapsed={isCollapsed}
                isOpen={isOpen}
                onOpenChange={setOpenCollapsible}
                route={route}
              />
            ) : (
              <SidebarMenuButton
                render={
                  <Link
                    className={cn(
                      "flex items-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-sidebar-muted hover:text-foreground",
                      isCollapsed && "justify-center"
                    )}
                    href={route.link as NextRoute}
                    prefetch={true}
                  />
                }
                tooltip={route.title}
              >
                {route.icon}
                {!isCollapsed && (
                  <span className="ml-2 font-medium text-sm">
                    {route.title}
                  </span>
                )}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
