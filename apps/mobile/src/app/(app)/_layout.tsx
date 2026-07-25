import { Redirect, Tabs } from "expo-router";
import { Spinner } from "heroui-native";
import { View } from "react-native";

import { AppTabBar } from "@/components/app-tab-bar";
import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";
import { AUTH_SIGN_IN, ONBOARDING } from "@/lib/routes";

export default function AppLayout() {
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

  return (
    <Tabs
      screenOptions={{
        animation: "fade",
        headerShown: false,
        lazy: true,
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarAccessibilityLabel: "Home tab",
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarAccessibilityLabel: "Tasks tab",
          title: "Tasks",
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarAccessibilityLabel: "More tab",
          title: "More",
        }}
      />
    </Tabs>
  );
}
