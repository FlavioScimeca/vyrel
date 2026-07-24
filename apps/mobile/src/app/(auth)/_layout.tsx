import { Redirect, Stack } from "expo-router";
import { Spinner } from "heroui-native";
import { View } from "react-native";

import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";
import { APP_HOME, ONBOARDING } from "@/lib/routes";

export default function AuthLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (session !== null && session !== undefined) {
    if (getActiveOrganizationId(session) === null) {
      return <Redirect href={ONBOARDING} />;
    }
    return <Redirect href={APP_HOME} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="verified" />
    </Stack>
  );
}
