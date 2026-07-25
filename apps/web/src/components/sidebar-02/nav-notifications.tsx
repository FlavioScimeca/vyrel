"use client";

import { IconBell } from "@tabler/icons-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@vyrel/shared/ui";

type Notification = {
  id: string;
  avatar: string;
  fallback: string;
  text: string;
  time: string;
};

export function NotificationsPopover({
  notifications,
}: {
  notifications: Notification[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Open notifications"
            className="rounded-full"
            size="icon"
            variant="ghost"
          />
        }
      >
        <IconBell className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="my-6 w-80" side="right">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.map(({ id, avatar, fallback, text, time }) => (
            <DropdownMenuItem className="flex items-start gap-3" key={id}>
              <Avatar className="size-8">
                <AvatarImage alt="Avatar" src={avatar} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{text}</span>
                <span className="text-muted-foreground text-xs">{time}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-muted-foreground text-sm hover:text-primary">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
