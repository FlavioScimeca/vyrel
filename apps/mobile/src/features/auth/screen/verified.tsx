import { router } from "expo-router";
import { Button, Surface, Typography } from "heroui-native";
import { View } from "react-native";

import { AUTH_SIGN_IN } from "@/lib/routes";

export function VerifiedScreen() {
  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Surface className="gap-6 rounded-3xl p-6" variant="secondary">
        <View className="gap-2">
          <Typography.Heading className="text-2xl">
            Email verified
          </Typography.Heading>
          <Typography.Paragraph>
            Your email is confirmed. You can continue to sign in.
          </Typography.Paragraph>
        </View>
        <Button onPress={() => router.replace(AUTH_SIGN_IN)}>
          <Button.Label>Continue</Button.Label>
        </Button>
      </Surface>
    </View>
  );
}
