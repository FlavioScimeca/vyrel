import { Redirect } from "expo-router";
import { Spinner } from "heroui-native";
import { View } from "react-native";

import { TasksScreen } from "@/features/dashboard/task/screen/tasks";
import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";
import { ONBOARDING } from "@/lib/routes";

export default function TasksRoute() {
  const { data: session, isPending } = authClient.useSession();
  const organizationId = getActiveOrganizationId(session);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (organizationId === null) {
    return <Redirect href={ONBOARDING} />;
  }

  return <TasksScreen organizationId={organizationId} />;
}
