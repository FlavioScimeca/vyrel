import { useQuery } from "@apollo/client/react";
import {
  Button,
  Input,
  Label,
  Spinner,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { ScrollView, View } from "react-native";

import { CreateTaskDialog } from "@/features/dashboard/task/components/create-task-dialog";
import { TaskList } from "@/features/dashboard/task/components/task-list";
import { TaskListScopeProvider } from "@/features/dashboard/task/context/task-list-scope";
import { ListTasksDocument } from "@/features/dashboard/task/graphql/queries";
import { useTaskFilters } from "@/features/dashboard/task/hooks/use-task-filters";

export function TasksScreen({ organizationId }: { organizationId: string }) {
  const { clearFilters, hasActiveFilters, queryVariables, search, setSearch } =
    useTaskFilters();

  const listVariables = {
    organizationId,
    ...queryVariables,
  };

  const { data, error, loading, refetch } = useQuery(ListTasksDocument, {
    variables: listVariables,
  });

  return (
    <TaskListScopeProvider listVariables={listVariables}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 p-4 pb-10"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Typography.Heading className="text-2xl">Tasks</Typography.Heading>
            <Typography.Paragraph>
              Track work for your active organization.
            </Typography.Paragraph>
          </View>
          <CreateTaskDialog organizationId={organizationId} />
        </View>

        <TextField>
          <Label>Search</Label>
          <Input
            onChangeText={setSearch}
            placeholder="Search title or description"
            value={search}
          />
        </TextField>

        {error === undefined ? null : (
          <Surface className="gap-3 rounded-2xl p-4" variant="secondary">
            <Typography className="text-danger">
              Unable to load tasks. Please try again.
            </Typography>
            <Button onPress={() => refetch()} size="sm" variant="secondary">
              <Button.Label>Retry</Button.Label>
            </Button>
          </Surface>
        )}

        {loading && data === undefined ? (
          <View className="items-center py-10">
            <Spinner />
          </View>
        ) : (
          <TaskList
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            tasks={data?.tasks ?? []}
          />
        )}
      </ScrollView>
    </TaskListScopeProvider>
  );
}
