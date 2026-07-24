import { router, useLocalSearchParams } from "expo-router";
import { Button, Spinner, Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { AuthScaffold } from "@/features/auth/components/auth-scaffold";
import { authClient } from "@/lib/auth-client";
import { APP_HOME, AUTH_SIGN_IN } from "@/lib/routes";

export default function AcceptInvitationRoute() {
  const { invitationId } = useLocalSearchParams<{ invitationId: string }>();
  const { data: session, isPending } = authClient.useSession();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string>();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  return (
    <AuthScaffold
      description="Join the workspace and start collaborating in Vyrel."
      title="Workspace invitation"
    >
      <View className="gap-5">
        {error === undefined ? null : (
          <View
            accessibilityRole="alert"
            className="rounded-2xl bg-danger-soft p-4"
          >
            <Typography className="text-danger-soft-foreground">
              {error}
            </Typography>
          </View>
        )}
        {session === null || session === undefined ? (
          <>
            <Typography className="text-muted">
              Sign in with the email address that received this invitation.
            </Typography>
            <Button
              onPress={() =>
                router.push({
                  params: { invitationId },
                  pathname: AUTH_SIGN_IN,
                })
              }
              size="lg"
            >
              <Button.Label>Sign in to accept</Button.Label>
            </Button>
          </>
        ) : (
          <>
            <Typography className="text-muted">
              Signed in as {session.user.email}
            </Typography>
            <Button
              isDisabled={accepting || !invitationId}
              onPress={async () => {
                setAccepting(true);
                setError(undefined);
                const result =
                  await authClient.organization.acceptInvitation({
                    invitationId,
                  });
                if (result.error) {
                  setError(
                    result.error.message ?? "Unable to accept invitation."
                  );
                  setAccepting(false);
                  return;
                }
                await authClient.organization.setActive({
                  organizationId: result.data.invitation.organizationId,
                });
                router.replace(APP_HOME);
              }}
              size="lg"
            >
              {accepting ? <Spinner color="default" size="sm" /> : null}
              <Button.Label>
                {accepting ? "Joining workspace…" : "Accept invitation"}
              </Button.Label>
            </Button>
          </>
        )}
      </View>
    </AuthScaffold>
  );
}
