import { router } from "expo-router";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";

import { AuthScaffold } from "@/features/auth/components/auth-scaffold";
import { AUTH_SIGN_IN } from "@/lib/routes";

export function VerifiedScreen() {
  return (
    <AuthScaffold
      description="Your email is confirmed. You can safely continue to your account."
      title="Email verified"
    >
      <View className="gap-5">
        <View
          accessibilityRole="alert"
          className="rounded-3xl bg-success-soft p-5"
        >
          <Typography className="text-success-soft-foreground">
            Verification complete. Welcome to Vyrel.
          </Typography>
        </View>
        <Button onPress={() => router.replace(AUTH_SIGN_IN)} size="lg">
          <Button.Label>Continue to sign in</Button.Label>
        </Button>
      </View>
    </AuthScaffold>
  );
}
