"use client";

import { IconBuilding } from "@tabler/icons-react";
import { readFragment } from "gql.tada";

const WHITESPACE_PATTERN = /\s+/;

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@vyrel/shared/ui";

import {
  OrganizationListItemFragment,
  type OrganizationListItemRef,
} from "@/features/dashboard/organization/graphql/fragments";
import { formatMediumDate } from "@/lib/format-date";

type OrganizationListProps = {
  organizations: readonly OrganizationListItemRef[];
};

function OrganizationCard({
  organization,
}: {
  organization: OrganizationListItemRef;
}) {
  const org = readFragment(OrganizationListItemFragment, organization);
  const imageSrc = org.imageThumb ?? org.imageFull;
  const initials = org.name
    .split(WHITESPACE_PATTERN)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <Avatar className="size-12 rounded-lg" size="lg">
          {imageSrc !== null && imageSrc.length > 0 ? (
            <AvatarImage
              alt={`${org.name} logo`}
              className="rounded-lg"
              src={imageSrc}
            />
          ) : null}
          <AvatarFallback className="rounded-lg">
            {initials.length > 0 ? (
              initials
            ) : (
              <IconBuilding className="size-5" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="truncate text-base">{org.name}</CardTitle>
          <CardDescription className="truncate">{org.slug}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Created {formatMediumDate(org.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}

export function OrganizationList({ organizations }: OrganizationListProps) {
  if (organizations.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBuilding />
          </EmptyMedia>
          <EmptyTitle>No organizations yet</EmptyTitle>
          <EmptyDescription>
            Create your first organization to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {organizations.map((organization) => {
        const org = readFragment(OrganizationListItemFragment, organization);

        return <OrganizationCard key={org.id} organization={organization} />;
      })}
    </div>
  );
}
