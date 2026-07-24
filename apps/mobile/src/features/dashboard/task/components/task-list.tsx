import { Image } from "expo-image";
import { router } from "expo-router";
import { readFragment } from "gql.tada";
import {
  Chip,
  Spinner,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { EmptyState, ErrorState } from "@/components/screen-state";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { formatMediumDate } from "@/lib/format-date";
import { haptics } from "@/lib/haptics";

type TaskListProps = {
  error?: string;
  hasActiveFilters?: boolean;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  onClearFilters?: () => void;
  onEndReached: () => void;
  onRefresh: () => void;
  tasks: readonly TaskListItemRef[];
};

const STATUS_LABEL = {
  DONE: "Done",
  IN_PROGRESS: "In progress",
  TODO: "Todo",
} as const;

const PRIORITY_LABEL = {
  HIGH: "High",
  LOW: "Low",
  MEDIUM: "Medium",
  NONE: "",
} as const;

export function TaskRow({ task }: { task: TaskListItemRef }) {
  const item = readFragment(TaskListItemFragment, task);
  const imageSrc = item.imageThumb ?? item.imageFull;

  return (
    <Pressable
      accessibilityHint="Opens task details"
      accessibilityRole="button"
      onPress={() => {
        haptics.selection();
        router.push(`./${item.id}`);
      }}
    >
      <Surface className="gap-3 rounded-3xl p-4" variant="secondary">
        <View className="flex-row items-start gap-3">
          {imageSrc ? (
            <Image
              accessibilityLabel={`Image for ${item.title}`}
              className="size-12 rounded-2xl"
              contentFit="cover"
              source={{ uri: imageSrc }}
            />
          ) : (
            <View className="size-12 items-center justify-center rounded-2xl bg-accent-soft">
              <Typography className="font-semibold text-accent text-lg">
                {item.title.charAt(0).toUpperCase()}
              </Typography>
            </View>
          )}
          <View className="min-w-0 flex-1 gap-1.5">
            <Typography className="font-semibold text-base" numberOfLines={1}>
              {item.title}
            </Typography>
            {item.description ? (
              <Typography className="text-muted text-sm" numberOfLines={2}>
                {item.description}
              </Typography>
            ) : null}
            <View className="flex-row flex-wrap items-center gap-2">
              <Chip
                color={item.status === "DONE" ? "success" : "default"}
                size="sm"
                variant="soft"
              >
                <Chip.Label>{STATUS_LABEL[item.status]}</Chip.Label>
              </Chip>
              {item.priority === "NONE" ? null : (
                <Chip
                  color={item.priority === "HIGH" ? "danger" : "warning"}
                  size="sm"
                  variant="soft"
                >
                  <Chip.Label>{PRIORITY_LABEL[item.priority]}</Chip.Label>
                </Chip>
              )}
              {item.dueDate ? (
                <Typography className="text-muted text-xs">
                  Due {formatMediumDate(item.dueDate)}
                </Typography>
              ) : null}
            </View>
          </View>
        </View>
        <View className="flex-row items-center justify-between">
          <Typography className="text-muted text-xs">
            Updated {formatMediumDate(item.updatedAt)}
          </Typography>
          <Typography className="text-muted text-xs">
            {item.assignee?.name ?? "Unassigned"} ›
          </Typography>
        </View>
      </Surface>
    </Pressable>
  );
}

export function TaskList({
  error,
  hasActiveFilters = false,
  hasNextPage,
  isLoadingMore,
  isRefreshing,
  onClearFilters,
  onEndReached,
  onRefresh,
  tasks,
}: TaskListProps) {
  const accent = useThemeColor("accent");

  if (error !== undefined && tasks.length === 0) {
    return <ErrorState message={error} onRetry={onRefresh} />;
  }

  return (
    <FlatList
      className="flex-1"
      contentContainerClassName="gap-3 px-5 pb-10 pt-3"
      data={[...tasks]}
      keyExtractor={(task) => readFragment(TaskListItemFragment, task).id}
      ListEmptyComponent={
        <EmptyState
          actionLabel={hasActiveFilters ? "Clear filters" : undefined}
          description={
            hasActiveFilters
              ? "Try a broader search or remove one of your filters."
              : "Create your first task and give today a clear next step."
          }
          onAction={onClearFilters}
          title={hasActiveFilters ? "No matching tasks" : "A clean slate"}
        />
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View className="items-center py-5">
            <Spinner size="sm" />
          </View>
        ) : error === undefined ? (
          hasNextPage ? (
            <View className="h-8" />
          ) : null
        ) : (
          <ErrorState message={error} onRetry={onEndReached} />
        )
      }
      onEndReached={hasNextPage && !isLoadingMore ? onEndReached : undefined}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={accent}
        />
      }
      renderItem={({ item }) => <TaskRow task={item} />}
    />
  );
}
