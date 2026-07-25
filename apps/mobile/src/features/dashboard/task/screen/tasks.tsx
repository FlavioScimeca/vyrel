import { NetworkStatus } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useLocalSearchParams } from "expo-router";
import {
  BottomSheet,
  Button,
  Chip,
  SearchField,
  Typography,
} from "heroui-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { TaskListSkeleton } from "@/components/screen-state";
import { CreateTaskDialog } from "@/features/dashboard/task/components/create-task-dialog";
import { TaskList } from "@/features/dashboard/task/components/task-list";
import {
  TaskConnectionDocument,
  TaskLabelsDocument,
} from "@/features/dashboard/task/graphql/queries";
import {
  type TaskDueFilter,
  type TaskPriorityFilter,
  type TaskSort,
  type TaskStatusFilter,
  useTaskFilters,
} from "@/features/dashboard/task/hooks/use-task-filters";
import { authClient } from "@/lib/auth-client";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { label: string; value: TaskStatusFilter }[] = [
  { label: "Todo", value: "TODO" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Done", value: "DONE" },
];
const PRIORITY_OPTIONS: { label: string; value: TaskPriorityFilter }[] = [
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
  { label: "No priority", value: "NONE" },
];
const SORT_OPTIONS: { label: string; value: TaskSort }[] = [
  { label: "Recently updated", value: "RECENTLY_UPDATED" },
  { label: "Due date", value: "DUE_DATE" },
  { label: "Priority", value: "PRIORITY" },
  { label: "Newest", value: "NEWEST" },
];
const DUE_OPTIONS: { label: string; value: TaskDueFilter }[] = [
  { label: "Any date", value: "ALL" },
  { label: "Due today", value: "TODAY" },
  { label: "Overdue", value: "OVERDUE" },
];

export function TasksScreen({ organizationId }: { organizationId: string }) {
  const params = useLocalSearchParams<{ status?: TaskStatusFilter }>();
  const filters = useTaskFilters(params.status);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string>();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const labels = useQuery(TaskLabelsDocument, {
    variables: { organizationId },
  });
  const variables = {
    first: PAGE_SIZE,
    organizationId,
    ...filters.queryVariables,
  };
  const { data, error, fetchMore, networkStatus, refetch } = useQuery(
    TaskConnectionDocument,
    {
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
      variables,
    }
  );
  const connection = data?.taskConnection;
  const tasks = connection?.nodes ?? [];
  const isInitialLoading =
    data === undefined && networkStatus === NetworkStatus.loading;
  const isRefreshing = networkStatus === NetworkStatus.refetch;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  useEffect(() => {
    let active = true;
    authClient.organization
      .listMembers({ query: { limit: 100, organizationId } })
      .then(({ data: memberData }) => {
        if (active) {
          setMembers(
            (memberData?.members ?? []).map((member) => ({
              id: member.userId,
              name: member.user.name,
            }))
          );
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [organizationId]);

  const loadMore = async () => {
    if (
      isLoadingMore ||
      connection?.pageInfo.hasNextPage !== true ||
      connection.pageInfo.endCursor === null
    ) {
      return;
    }
    setLoadMoreError(undefined);
    try {
      await fetchMore({
        updateQuery: (previous, { fetchMoreResult }) => ({
          taskConnection: {
            ...fetchMoreResult.taskConnection,
            nodes: [
              ...previous.taskConnection.nodes,
              ...fetchMoreResult.taskConnection.nodes,
            ],
          },
        }),
        variables: { after: connection.pageInfo.endCursor },
      });
    } catch {
      setLoadMoreError("More tasks could not be loaded.");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        action={<CreateTaskDialog organizationId={organizationId} />}
        eyebrow={
          filters.hasActiveFilters
            ? "Filtered view"
            : `${connection?.nodes.length ?? 0} loaded`
        }
        title="Tasks"
      />

      <View className="gap-3 px-5 pb-2">
        <SearchField onChange={filters.setSearch} value={filters.search}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search tasks" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <ScrollView
          contentContainerClassName="gap-2"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <Chip
            accessibilityRole="button"
            color={filters.hasActiveFilters ? "accent" : "default"}
            onPress={() => setFilterOpen(true)}
            variant="soft"
          >
            <Chip.Label>
              {filters.hasActiveFilters ? "Filters active" : "Filter & sort"}
            </Chip.Label>
          </Chip>
          {filters.statuses.map((status) => (
            <Chip
              color="accent"
              key={status}
              onPress={() => filters.toggleStatus(status)}
              variant="soft"
            >
              <Chip.Label>
                {
                  STATUS_OPTIONS.find((option) => option.value === status)
                    ?.label
                }
                {"  ×"}
              </Chip.Label>
            </Chip>
          ))}
        </ScrollView>
      </View>

      {isInitialLoading ? (
        <TaskListSkeleton />
      ) : (
        <TaskList
          error={loadMoreError ?? error?.message}
          hasActiveFilters={filters.hasActiveFilters}
          hasNextPage={connection?.pageInfo.hasNextPage ?? false}
          isLoadingMore={isLoadingMore}
          isRefreshing={isRefreshing}
          onClearFilters={filters.clearFilters}
          onEndReached={loadMore}
          onRefresh={() => {
            setLoadMoreError(undefined);
            refetch();
          }}
          tasks={tasks}
        />
      )}

      <BottomSheet isOpen={filterOpen} onOpenChange={setFilterOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content className="gap-6 pb-safe-offset-5">
            <BottomSheet.Close />
            <View className="gap-1">
              <BottomSheet.Title>Filter and sort</BottomSheet.Title>
              <BottomSheet.Description>
                Shape this view without changing anyone else’s tasks.
              </BottomSheet.Description>
            </View>
            <FilterGroup
              label="Status"
              options={STATUS_OPTIONS}
              selected={filters.statuses}
              toggle={filters.toggleStatus}
            />
            <FilterGroup
              label="Priority"
              options={PRIORITY_OPTIONS}
              selected={filters.priorities}
              toggle={filters.togglePriority}
            />
            <View className="gap-2">
              <Typography className="font-medium">Due</Typography>
              <View className="flex-row flex-wrap gap-2">
                {DUE_OPTIONS.map((option) => (
                  <Chip
                    accessibilityState={{
                      selected: filters.due === option.value,
                    }}
                    color={filters.due === option.value ? "accent" : "default"}
                    key={option.value}
                    onPress={() => filters.setDue(option.value)}
                    variant="soft"
                  >
                    <Chip.Label>{option.label}</Chip.Label>
                  </Chip>
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Typography className="font-medium">Assignee</Typography>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  color={filters.assigneeId === "" ? "accent" : "default"}
                  onPress={() => filters.setAssigneeId("")}
                  variant="soft"
                >
                  <Chip.Label>Anyone</Chip.Label>
                </Chip>
                {members.map((member) => (
                  <Chip
                    color={
                      filters.assigneeId === member.id ? "accent" : "default"
                    }
                    key={member.id}
                    onPress={() => filters.setAssigneeId(member.id)}
                    variant="soft"
                  >
                    <Chip.Label>{member.name}</Chip.Label>
                  </Chip>
                ))}
              </View>
            </View>
            {(labels.data?.taskLabels ?? []).length > 0 ? (
              <View className="gap-2">
                <Typography className="font-medium">Labels</Typography>
                <View className="flex-row flex-wrap gap-2">
                  {(labels.data?.taskLabels ?? []).map((label) => (
                    <Chip
                      color={
                        filters.labelIds.includes(label.id)
                          ? "accent"
                          : "default"
                      }
                      key={label.id}
                      onPress={() => filters.toggleLabel(label.id)}
                      variant="soft"
                    >
                      <Chip.Label>{label.name}</Chip.Label>
                    </Chip>
                  ))}
                </View>
              </View>
            ) : null}
            <View className="gap-2">
              <Typography className="font-medium">Sort by</Typography>
              <View className="flex-row flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <Chip
                    accessibilityState={{
                      selected: filters.sort === option.value,
                    }}
                    color={filters.sort === option.value ? "accent" : "default"}
                    key={option.value}
                    onPress={() => filters.setSort(option.value)}
                    variant="soft"
                  >
                    <Chip.Label>{option.label}</Chip.Label>
                  </Chip>
                ))}
              </View>
            </View>
            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                onPress={filters.clearFilters}
                variant="secondary"
              >
                <Button.Label>Reset</Button.Label>
              </Button>
              <Button className="flex-1" onPress={() => setFilterOpen(false)}>
                <Button.Label>Show tasks</Button.Label>
              </Button>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  selected,
  toggle,
}: {
  label: string;
  options: { label: string; value: T }[];
  selected: T[];
  toggle: (value: T) => void;
}) {
  return (
    <View className="gap-2">
      <Typography className="font-medium">{label}</Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            accessibilityState={{ selected: selected.includes(option.value) }}
            color={selected.includes(option.value) ? "accent" : "default"}
            key={option.value}
            onPress={() => toggle(option.value)}
            variant="soft"
          >
            <Chip.Label>{option.label}</Chip.Label>
          </Chip>
        ))}
      </View>
    </View>
  );
}
