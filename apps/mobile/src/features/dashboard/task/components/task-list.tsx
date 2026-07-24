import { Image } from "expo-image";
import { readFragment } from "gql.tada";
import { Button, Surface, Typography } from "heroui-native";
import { View } from "react-native";

import { DeleteTaskDialog } from "@/features/dashboard/task/components/delete-task-dialog";
import { EditTaskDialog } from "@/features/dashboard/task/components/edit-task-dialog";
import { useTaskListScope } from "@/features/dashboard/task/context/task-list-scope";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { formatMediumDate } from "@/lib/format-date";

type TaskListProps = {
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  tasks: readonly TaskListItemRef[];
};

function TaskCard({ task }: { task: TaskListItemRef }) {
  const item = readFragment(TaskListItemFragment, task);
  const imageSrc = item.imageThumb ?? item.imageFull;
  const wasUpdated = item.updatedAt !== item.createdAt;

  return (
    <Surface className="gap-3 rounded-2xl p-4" variant="secondary">
      <View className="flex-row items-start gap-3">
        {imageSrc !== null && imageSrc.length > 0 ? (
          <Image
            className="size-12 rounded-lg"
            contentFit="cover"
            source={{ uri: imageSrc }}
          />
        ) : (
          <View className="size-12 items-center justify-center rounded-lg bg-default">
            <Typography className="font-semibold text-sm">
              {item.title.charAt(0).toUpperCase()}
            </Typography>
          </View>
        )}
        <View className="min-w-0 flex-1 gap-1">
          <Typography className="font-semibold text-base">
            {item.title}
          </Typography>
          {item.description !== null && item.description.length > 0 ? (
            <Typography className="text-muted text-sm" numberOfLines={2}>
              {item.description}
            </Typography>
          ) : null}
          <Typography className="text-muted text-xs">
            {wasUpdated
              ? `Updated ${formatMediumDate(item.updatedAt)}`
              : `Created ${formatMediumDate(item.createdAt)}`}
          </Typography>
        </View>
      </View>
      <View className="flex-row justify-end gap-2">
        <EditTaskDialog task={task} />
        <DeleteTaskDialog task={task} />
      </View>
    </Surface>
  );
}

export function TaskList({
  hasActiveFilters = false,
  onClearFilters,
  tasks,
}: TaskListProps) {
  const { identity } = useTaskListScope();

  if (tasks.length === 0) {
    return (
      <Surface
        className="items-center gap-3 rounded-2xl p-8"
        variant="secondary"
      >
        <Typography.Heading className="text-lg">
          {hasActiveFilters ? "No matching tasks" : "No tasks yet"}
        </Typography.Heading>
        <Typography.Paragraph className="text-center">
          {hasActiveFilters
            ? "Try clearing your search."
            : "Create a task to get started."}
        </Typography.Paragraph>
        {hasActiveFilters && onClearFilters !== undefined ? (
          <Button onPress={onClearFilters} variant="secondary">
            <Button.Label>Clear filters</Button.Label>
          </Button>
        ) : null}
      </Surface>
    );
  }

  return (
    <View className="gap-3">
      {tasks.map((task) => {
        const item = readFragment(TaskListItemFragment, task);
        return <TaskCard key={identity.getKey(item.id)} task={task} />;
      })}
    </View>
  );
}
