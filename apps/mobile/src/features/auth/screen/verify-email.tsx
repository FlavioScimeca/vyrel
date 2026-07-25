import { router, useLocalSearchParams } from "expo-router";
import { Button, Spinner, Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { AuthScaffold } from "@/features/auth/components/auth-scaffold";
import { authClient } from "@/lib/auth-client";
import { AUTH_SIGN_IN } from "@/lib/routes";

export function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  return (
    <AuthScaffold
      description="Confirm your address to protect your account and accept workspace invitations."
      title="Check your email"
    >
      <View className="gap-5">
        <View className="gap-2 rounded-3xl bg-accent-soft p-5">
          <Typography className="font-medium text-accent">
            Verification link sent
          </Typography>
          <Typography className="text-muted">
            We sent a link to {email ?? "your email address"}. Open it on this
            device to continue.
          </Typography>
        </View>
        {message === undefined ? null : (
          <Typography
            accessibilityLiveRegion="polite"
            className="text-center text-success"
          >
            {message}
          </Typography>
        )}
        {error === undefined ? null : (
          <Typography
            accessibilityRole="alert"
            className="text-center text-danger"
          >
            {error}
          </Typography>
        )}
        <Button
          isDisabled={resending || email === undefined}
          onPress={async () => {
            if (email === undefined) {
              return;
            }
            setResending(true);
            setError(undefined);
            const result = await authClient.sendVerificationEmail({
              callbackURL: "vyrel-mobile://verified",
              email,
            });
            setResending(false);
            if (result.error) {
              setError(
                result.error.message ?? "Unable to resend verification email."
              );
              return;
            }
            setMessage("A new verification link is on its way.");
          }}
          size="lg"
          variant="secondary"
        >
          {resending ? <Spinner color="default" size="sm" /> : null}
          <Button.Label>
            {resending ? "Resending verification…" : "Resend verification"}
          </Button.Label>
        </Button>
        <Button onPress={() => router.replace(AUTH_SIGN_IN)} variant="tertiary">
          <Button.Label>Back to sign in</Button.Label>
        </Button>
      </View>
    </AuthScaffold>
  );
}
