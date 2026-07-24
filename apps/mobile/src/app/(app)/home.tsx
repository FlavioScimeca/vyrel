import { useQuery } from "@apollo/client/react";
import { router } from "expo-router";
import { readFragment } from "gql.tada";
import { Card, Spinner, Typography } from "heroui-native";
import { Pressable, ScrollView, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { OrganizationSwitcher } from "@/features/dashboard/organization/components/organization-switcher";
import { CreateTaskDialog } from "@/features/dashboard/task/components/create-task-dialog";
import { TaskRow } from "@/features/dashboard/task/components/task-list";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import {
  TaskConnectionDocument,
  TaskSummaryDocument,
} from "@/features/dashboard/task/graphql/queries";
import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function HomeRoute() {
  const { data: session } = authClient.useSession();
  const organizationId = getActiveOrganizationId(session);
  const today = formatLocalDate(new Date());
  const summary = useQuery(TaskSummaryDocument, {
    skip: organizationId === null,
    variables: { organizationId: organizationId ?? "" },
  });
  const todayTasks = useQuery(TaskConnectionDocument, {
    skip: organizationId === null,
    variables: {
      dueFrom: today,
      dueTo: today,
      first: 5,
      organizationId: organizationId ?? "",
      sort: "DUE_DATE",
    },
  });
  const recentTasks = useQuery(TaskConnectionDocument, {
    skip: organizationId === null,
    variables: {
      first: 5,
      organizationId: organizationId ?? "",
      sort: "RECENTLY_UPDATED",
    },
  });
  const firstName = session?.user.name?.split(/\s+/)[0];

  if (organizationId === null) {
    return null;
  }

  const counts = summary.data?.taskSummary;

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        action={<OrganizationSwitcher />}
        eyebrow="Your workspace"
        subtitle="A clear view of what deserves attention."
        title={`Hello${firstName ? `, ${firstName}` : ""}`}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 pb-10"
        refreshControl={undefined}
      >
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <Typography.Heading className="text-xl">
              Overview
            </Typography.Heading>
            <Typography className="text-muted text-sm">
              Progress across this workspace
            </Typography>
          </View>
          <CreateTaskDialog organizationId={organizationId} />
        </View>

        {summary.loading && counts === undefined ? (
          <View className="items-center py-4">
            <Spinner size="sm" />
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            <SummaryCard
              label="Todo"
              onPress={() =>
                router.push({ params: { status: "TODO" }, pathname: "/tasks" })
              }
              value={counts?.todo ?? 0}
            />
            <SummaryCard
              label="In progress"
              onPress={() =>
                router.push({
                  params: { status: "IN_PROGRESS" },
                  pathname: "/tasks",
                })
              }
              value={counts?.inProgress ?? 0}
            />
            <SummaryCard
              label="Done"
              onPress={() =>
                router.push({ params: { status: "DONE" }, pathname: "/tasks" })
              }
              value={counts?.done ?? 0}
            />
            <SummaryCard
              label="Overdue"
              onPress={() => router.push("/tasks")}
              tone="danger"
              value={counts?.overdue ?? 0}
            />
          </View>
        )}

        <TaskSection
          empty="Nothing is due today."
          loading={todayTasks.loading}
          tasks={todayTasks.data?.taskConnection.nodes ?? []}
          title="Today"
        />
        <TaskSection
          empty="Your recently updated tasks will appear here."
          loading={recentTasks.loading}
          tasks={recentTasks.data?.taskConnection.nodes ?? []}
          title="Recently updated"
        />
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  label,
  onPress,
  tone = "default",
  value,
}: {
  label: string;
  onPress: () => void;
  tone?: "danger" | "default";
  value: number;
}) {
  return (
    <Pressable
      accessibilityHint={`Shows ${label.toLowerCase()} tasks`}
      accessibilityRole="button"
      className="min-w-[46%] flex-1"
      onPress={onPress}
    >
      <Card className="gap-2 rounded-3xl p-4">
        <Typography
          className={`font-semibold text-3xl ${
            tone === "danger" ? "text-danger" : "text-foreground"
          }`}
        >
          {value}
        </Typography>
        <Typography className="text-muted text-sm">{label}</Typography>
      </Card>
    </Pressable>
  );
}

function TaskSection({
  empty,
  loading,
  tasks,
  title,
}: {
  empty: string;
  loading: boolean;
  tasks: Parameters<typeof TaskRow>[0]["task"][];
  title: string;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Typography.Heading className="text-xl">{title}</Typography.Heading>
        <Pressable
          accessibilityRole="button"
          className="min-h-11 justify-center px-2"
          onPress={() => router.push("/tasks")}
        >
          <Typography className="font-medium text-accent text-sm">
            View all
          </Typography>
        </Pressable>
      </View>
      {loading && tasks.length === 0 ? (
        <View className="items-center py-5">
          <Spinner size="sm" />
        </View>
      ) : tasks.length === 0 ? (
        <Card className="rounded-3xl p-5">
          <Typography className="text-muted">{empty}</Typography>
        </Card>
      ) : (
        <View className="gap-3">
          {tasks.map((task) => (
            <TaskRow
              key={readFragment(TaskListItemFragment, task).id}
              task={task}
            />
          ))}
        </View>
      )}
    </View>
  );
}
