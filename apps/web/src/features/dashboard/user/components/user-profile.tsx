"use client";

import { IconUser } from "@tabler/icons-react";
import { readFragment } from "gql.tada";

const WHITESPACE_PATTERN = /\s+/;

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
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
  UserProfileFragment,
  type UserProfileRef,
} from "@/features/dashboard/user/graphql/fragments";
import { formatMediumDate } from "@/lib/format-date";

type UserProfileProps = {
  user: UserProfileRef | null | undefined;
};

export function UserProfile({ user }: UserProfileProps) {
  if (user === null || user === undefined) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconUser />
          </EmptyMedia>
          <EmptyTitle>User not found</EmptyTitle>
          <EmptyDescription>
            Unable to load your profile information.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const profile = readFragment(UserProfileFragment, user);
  const imageSrc = profile.imageThumb ?? profile.imageFull;
  const initials = profile.name
    .split(WHITESPACE_PATTERN)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <Avatar className="size-12 rounded-lg" size="lg">
          {imageSrc !== null && imageSrc.length > 0 ? (
            <AvatarImage
              alt={`${profile.name} avatar`}
              className="rounded-lg"
              src={imageSrc}
            />
          ) : null}
          <AvatarFallback className="rounded-lg">
            {initials.length > 0 ? initials : <IconUser className="size-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate text-base">{profile.name}</CardTitle>
            <Badge variant={profile.emailVerified ? "default" : "secondary"}>
              {profile.emailVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>
          <CardDescription className="truncate">
            {profile.email}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-muted-foreground text-sm">
        <p>Created {formatMediumDate(profile.createdAt)}</p>
        <p>Updated {formatMediumDate(profile.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}
