"use client";

import { useQuery } from "@apollo/client/react";
import { IconBuilding, IconCheck } from "@tabler/icons-react";
import { readFragment } from "gql.tada";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  OrganizationListItemFragment,
  type OrganizationListItemRef,
} from "@/features/dashboard/organization/graphql/fragments";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";
import { authClient } from "@/lib/auth-client";

const WHITESPACE_PATTERN = /\s+/;

function organizationInitials(name: string): string {
  return name
    .split(WHITESPACE_PATTERN)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function OrganizationAvatar({
  className,
  imageSrc,
  name,
  size = "default",
}: {
  className?: string;
  imageSrc: string | null | undefined;
  name: string;
  size?: "default" | "sm" | "lg";
}) {
  const initials = organizationInitials(name);
  const hasImage =
    imageSrc !== null && imageSrc !== undefined && imageSrc.length > 0;

  return (
    <Avatar className={className} size={size}>
      {hasImage ? (
        <AvatarImage
          alt={`${name} logo`}
          className="rounded-lg"
          src={imageSrc}
        />
      ) : null}
      <AvatarFallback className="rounded-lg">
        {initials.length > 0 ? initials : <IconBuilding className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

type OrganizationOptionProps = {
  isActive: boolean;
  onSelect: (organizationId: string) => void;
  organization: OrganizationListItemRef;
};

function OrganizationOption({
  isActive,
  onSelect,
  organization,
}: OrganizationOptionProps) {
  const org = readFragment(OrganizationListItemFragment, organization);
  const imageSrc = org.imageThumb ?? org.imageFull;

  const handleSelect = () => {
    onSelect(org.id);
  };

  return (
    <DropdownMenuItem
      className="cursor-pointer gap-2 p-2"
      onClick={handleSelect}
    >
      <OrganizationAvatar
        className="size-6 rounded-sm border"
        imageSrc={imageSrc}
        name={org.name}
        size="sm"
      />
      <span className="truncate">{org.name}</span>
      {isActive ? <IconCheck className="ml-auto size-4 shrink-0" /> : null}
    </DropdownMenuItem>
  );
}

export function OrganizationSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const { data, loading } = useQuery(ListOrganizationsDocument);

  const activeOrganizationId =
    sessionData?.session.activeOrganizationId ?? null;
  const organizations = data?.organizations ?? [];

  const activeOrganizationRef =
    organizations.find((organization) => {
      const org = readFragment(OrganizationListItemFragment, organization);
      return org.id === activeOrganizationId;
    }) ?? organizations[0];

  const activeOrganization = activeOrganizationRef
    ? readFragment(OrganizationListItemFragment, activeOrganizationRef)
    : null;

  const handleSelect = async (organizationId: string) => {
    if (organizationId === activeOrganizationId) {
      return;
    }

    await authClient.organization.setActive({ organizationId });
    router.refresh();
  };

  if (loading || !activeOrganization) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="pointer-events-none" size="lg">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background text-foreground">
              <IconBuilding className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-muted-foreground">
                Organization
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const activeImageSrc =
    activeOrganization.imageThumb ?? activeOrganization.imageFull;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="cursor-pointer data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                size="lg"
                tooltip={activeOrganization.name}
              />
            }
          >
            <OrganizationAvatar
              className="size-8 rounded-lg"
              imageSrc={activeImageSrc}
              name={activeOrganization.name}
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {activeOrganization.name}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Organizations
              </DropdownMenuLabel>
              {organizations.map((organization) => {
                const org = readFragment(
                  OrganizationListItemFragment,
                  organization
                );

                return (
                  <OrganizationOption
                    isActive={org.id === activeOrganization.id}
                    key={org.id}
                    onSelect={handleSelect}
                    organization={organization}
                  />
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
