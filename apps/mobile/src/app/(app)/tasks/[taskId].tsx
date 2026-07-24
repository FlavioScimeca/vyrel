import { useQuery } from "@apollo/client/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { readFragment } from "gql.tada";
import { Card, Chip, Spinner, Typography } from "heroui-native";
import { ScrollView, View } from "react-native";

import { ErrorState } from "@/components/screen-state";
import { DeleteTaskDialog } from "@/features/dashboard/task/components/delete-task-dialog";
import { EditTaskDialog } from "@/features/dashboard/task/components/edit-task-dialog";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import { TaskDetailsDocument } from "@/features/dashboard/task/graphql/queries";
import { formatMediumDate } from "@/lib/format-date";

const STATUS_LABEL = {
  DONE: "Done",
  IN_PROGRESS: "In progress",
  TODO: "Todo",
} as const;

export default function TaskDetailsRoute() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { data, error, loading, refetch } = useQuery(TaskDetailsDocument, {
    skip: !taskId,
    variables: { id: taskId ?? "" },
  });

  if (loading && data === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (error !== undefined) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message={error.message} onRetry={refetch} />
      </View>
    );
  }

  if (data?.task == null) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState
          message="This task may have been deleted or moved."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  const task = readFragment(TaskListItemFragment, data.task);
  const image = task.imageFull ?? task.imageThumb;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 p-5 pb-safe-offset-10"
    >
      {image ? (
        <Image
          accessibilityLabel={`Image for ${task.title}`}
          className="aspect-[16/10] w-full rounded-3xl"
          contentFit="cover"
          source={{ uri: image }}
        />
      ) : null}

      <View className="gap-3">
        <View className="flex-row flex-wrap gap-2">
          <Chip
            color={task.status === "DONE" ? "success" : "accent"}
            variant="soft"
          >
            <Chip.Label>{STATUS_LABEL[task.status]}</Chip.Label>
          </Chip>
          {task.priority === "NONE" ? null : (
            <Chip
              color={task.priority === "HIGH" ? "danger" : "warning"}
              variant="soft"
            >
              <Chip.Label>{task.priority.toLowerCase()} priority</Chip.Label>
            </Chip>
          )}
          {task.labels.map((label) => (
            <Chip color="default" key={label.id} variant="soft">
              <Chip.Label>{label.name}</Chip.Label>
            </Chip>
          ))}
        </View>
        <Typography.Heading className="text-3xl">
          {task.title}
        </Typography.Heading>
        {task.description ? (
          <Typography className="text-base text-muted">
            {task.description}
          </Typography>
        ) : (
          <Typography className="text-muted">
            No description has been added.
          </Typography>
        )}
      </View>

      <Card className="gap-4 rounded-3xl p-5">
        <DetailRow
          label="Assignee"
          value={task.assignee?.name ?? "Unassigned"}
        />
        <DetailRow
          label="Due date"
          value={task.dueDate ? formatMediumDate(task.dueDate) : "No due date"}
        />
        <DetailRow label="Updated" value={formatMediumDate(task.updatedAt)} />
        <DetailRow label="Created" value={formatMediumDate(task.createdAt)} />
      </Card>

      <View className="gap-3">
        <EditTaskDialog task={data.task} />
        <DeleteTaskDialog onDeleted={() => router.back()} task={data.task} />
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Typography className="text-muted">{label}</Typography>
      <Typography className="flex-1 text-right font-medium">{value}</Typography>
    </View>
  );
}
