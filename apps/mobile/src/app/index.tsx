import { Redirect } from "expo-router";
import { Spinner } from "heroui-native";
import { View } from "react-native";

import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";
import { APP_HOME, AUTH_SIGN_IN, ONBOARDING } from "@/lib/routes";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (session === null || session === undefined) {
    return <Redirect href={AUTH_SIGN_IN} />;
  }

  if (getActiveOrganizationId(session) === null) {
    return <Redirect href={ONBOARDING} />;
  }

  return <Redirect href={APP_HOME} />;
}
