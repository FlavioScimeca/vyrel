import { Redirect, Tabs } from "expo-router";
import { Spinner, Typography } from "heroui-native";
import { View } from "react-native";

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
        headerShown: true,
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#737373",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Typography style={{ color }}>⌂</Typography>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => (
            <Typography style={{ color }}>☰</Typography>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          headerShown: false,
          title: "More",
          tabBarIcon: ({ color }) => (
            <Typography style={{ color }}>•••</Typography>
          ),
        }}
      />
    </Tabs>
  );
}
