"use client";

import {
  IconBuilding,
  IconChevronRight,
  IconLogout,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import type { Route as NextRoute } from "next";
import Link from "next/link";
import { ThemeModeSwitch } from "@/components/sidebar-02/theme-mode-switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

const managementLinks = [
  {
    title: "User",
    href: "/dashboard/management/user",
    icon: IconUser,
  },
  {
    title: "Organization",
    href: "/dashboard/management/organization",
    icon: IconBuilding,
  },
] as const;

async function handleSignOut() {
  await authClient.signOut();
  window.location.assign("/auth");
}

export function NavManagement() {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="cursor-pointer data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                size="lg"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background text-foreground">
              <IconSettings className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Settings</span>
            </div>
            <IconChevronRight className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="mb-4 w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Management
              </DropdownMenuLabel>
              {managementLinks.map(({ title, href, icon: Icon }) => (
                <DropdownMenuItem
                  className="cursor-pointer gap-2 p-2"
                  key={href}
                  render={<Link href={href as NextRoute} prefetch={true} />}
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Icon className="size-4 shrink-0" />
                  </div>
                  {title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ThemeModeSwitch />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 p-2 text-red-500"
              onClick={handleSignOut}
            >
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <IconLogout className="size-4 shrink-0" />
              </div>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
