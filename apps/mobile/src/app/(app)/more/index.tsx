import { router } from "expo-router";
import { Button, Surface, Typography } from "heroui-native";
import { Pressable, View } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

import { authClient } from "@/lib/auth-client";
import { APP_ORGANIZATION, APP_USER, AUTH_SIGN_IN } from "@/lib/routes";

export default function MoreIndexRoute() {
  const { theme } = useUniwind();

  return (
    <View className="flex-1 gap-3 bg-background p-4">
      <Pressable onPress={() => router.push(APP_USER)}>
        <Surface className="rounded-2xl p-4" variant="secondary">
          <Typography className="font-medium">Profile</Typography>
          <Typography className="text-muted text-sm">
            View your account details
          </Typography>
        </Surface>
      </Pressable>

      <Pressable onPress={() => router.push(APP_ORGANIZATION)}>
        <Surface className="rounded-2xl p-4" variant="secondary">
          <Typography className="font-medium">Organizations</Typography>
          <Typography className="text-muted text-sm">
            Manage workspaces
          </Typography>
        </Surface>
      </Pressable>

      <Surface className="gap-3 rounded-2xl p-4" variant="secondary">
        <Typography className="font-medium">Theme</Typography>
        <View className="flex-row gap-2">
          <Button
            onPress={() => Uniwind.setTheme("light")}
            size="sm"
            variant={theme === "light" ? "primary" : "secondary"}
          >
            <Button.Label>Light</Button.Label>
          </Button>
          <Button
            onPress={() => Uniwind.setTheme("dark")}
            size="sm"
            variant={theme === "dark" ? "primary" : "secondary"}
          >
            <Button.Label>Dark</Button.Label>
          </Button>
        </View>
      </Surface>

      <Button
        onPress={async () => {
          await authClient.signOut();
          router.replace(AUTH_SIGN_IN);
        }}
        variant="danger-soft"
      >
        <Button.Label>Sign out</Button.Label>
      </Button>
    </View>
  );
}
