"use client";

import { IconChecklist } from "@tabler/icons-react";
import { readFragment } from "gql.tada";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DeleteTaskDialog } from "@/features/dashboard/task/components/delete-task-dialog";
import { EditTaskDialog } from "@/features/dashboard/task/components/edit-task-dialog";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";

const WHITESPACE_PATTERN = /\s+/;

type TaskListProps = {
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  tasks: readonly TaskListItemRef[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function TaskCard({ task }: { task: TaskListItemRef }) {
  const item = readFragment(TaskListItemFragment, task);
  const imageSrc = item.imageThumb ?? item.imageFull;
  const initials = item.title
    .split(WHITESPACE_PATTERN)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const wasUpdated = item.updatedAt !== item.createdAt;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <Avatar className="size-12 rounded-lg" size="lg">
          {imageSrc !== null && imageSrc.length > 0 ? (
            <AvatarImage
              alt={`${item.title} image`}
              className="rounded-lg"
              src={imageSrc}
            />
          ) : null}
          <AvatarFallback className="rounded-lg">
            {initials.length > 0 ? (
              initials
            ) : (
              <IconChecklist className="size-5" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="truncate text-base">{item.title}</CardTitle>
          {item.description !== null && item.description.length > 0 ? (
            <CardDescription className="line-clamp-2">
              {item.description}
            </CardDescription>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EditTaskDialog task={task} />
          <DeleteTaskDialog task={task} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          {wasUpdated
            ? `Updated ${formatDate(item.updatedAt)}`
            : `Created ${formatDate(item.createdAt)}`}
        </p>
      </CardContent>
    </Card>
  );
}

export function TaskList({
  hasActiveFilters = false,
  onClearFilters,
  tasks,
}: TaskListProps) {
  if (tasks.length === 0) {
    if (hasActiveFilters) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconChecklist />
            </EmptyMedia>
            <EmptyTitle>No tasks match your filters</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search or date range
              {onClearFilters === undefined ? (
                "."
              ) : (
                <>
                  , or{" "}
                  <button
                    className="text-foreground underline underline-offset-4"
                    onClick={onClearFilters}
                    type="button"
                  >
                    clear filters
                  </button>
                  .
                </>
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconChecklist />
          </EmptyMedia>
          <EmptyTitle>No tasks yet</EmptyTitle>
          <EmptyDescription>
            Create your first task to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => {
        const item = readFragment(TaskListItemFragment, task);

        return <TaskCard key={item.id} task={task} />;
      })}
    </div>
  );
}
