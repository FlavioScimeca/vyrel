import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
} from "heroui-native";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { type TextInput, View } from "react-native";

import {
  AuthScaffold,
  FormAlert,
} from "@/features/auth/components/auth-scaffold";
import { PasswordField } from "@/features/auth/components/password-field";
import {
  type ResetPasswordRequestValues,
  type ResetPasswordValues,
  resetPasswordDefaultValues,
  resetPasswordRequestDefaultValues,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from "@/features/auth/form.schema";
import { authClient } from "@/lib/auth-client";
import { AUTH_SIGN_IN } from "@/lib/routes";

function ResetPasswordRequestForm() {
  const form = useForm<ResetPasswordRequestValues>({
    defaultValues: resetPasswordRequestDefaultValues,
    resolver: zodResolver(resetPasswordRequestSchema),
  });
  const [sent, setSent] = useState(false);
  const pending = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/(auth)/reset-password",
    });

    if (error) {
      form.setError("root", {
        message: error.message ?? "Unable to send reset email.",
      });
      return;
    }
    setSent(true);
  });

  if (sent) {
    return (
      <View className="gap-5">
        <View
          accessibilityLiveRegion="polite"
          className="gap-2 rounded-3xl bg-success-soft p-5"
        >
          <Typography className="font-semibold text-lg text-success-soft-foreground">
            Check your email
          </Typography>
          <Typography className="text-success-soft-foreground">
            If an account exists for that address, a reset link is on its way.
          </Typography>
        </View>
        <Button onPress={() => router.replace(AUTH_SIGN_IN)} size="lg">
          <Button.Label>Back to sign in</Button.Label>
        </Button>
        <Button onPress={() => setSent(false)} variant="tertiary">
          <Button.Label>Use a different email</Button.Label>
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField isInvalid={fieldState.error !== undefined} isRequired>
            <Label>Email</Label>
            <Input
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              onSubmitEditing={onSubmit}
              placeholder="you@example.com"
              returnKeyType="send"
              submitBehavior="blurAndSubmit"
              value={field.value}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />
      <FormAlert message={form.formState.errors.root?.message} />
      <Button isDisabled={pending} onPress={onSubmit} size="lg">
        {pending ? <Spinner color="default" size="sm" /> : null}
        <Button.Label>
          {pending ? "Sending reset link…" : "Send reset link"}
        </Button.Label>
      </Button>
    </View>
  );
}

function ResetPasswordConfirmForm({ token }: { token: string }) {
  const form = useForm<ResetPasswordValues>({
    defaultValues: resetPasswordDefaultValues,
    resolver: zodResolver(resetPasswordSchema),
  });
  const confirmPasswordRef = useRef<TextInput>(null);
  const pending = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (error) {
      form.setError("root", {
        message: error.message ?? "Unable to reset password.",
      });
      return;
    }
    router.replace(AUTH_SIGN_IN);
  });

  return (
    <View className="gap-5">
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordField
            autoComplete="new-password"
            error={fieldState.error?.message}
            label="New password"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            returnKeyType="next"
            showRequirements
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            autoComplete="new-password"
            error={fieldState.error?.message}
            inputRef={confirmPasswordRef}
            label="Confirm password"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
            value={field.value}
          />
        )}
      />
      <FormAlert message={form.formState.errors.root?.message} />
      <Button isDisabled={pending} onPress={onSubmit} size="lg">
        {pending ? <Spinner color="default" size="sm" /> : null}
        <Button.Label>
          {pending ? "Updating password…" : "Update password"}
        </Button.Label>
      </Button>
    </View>
  );
}

export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : undefined;

  return (
    <AuthScaffold
      description={
        token === undefined
          ? "We’ll send a secure link to your account email."
          : "Choose a password you have not used elsewhere."
      }
      showBack
      title={token === undefined ? "Reset password" : "Choose a new password"}
    >
      {token === undefined ? (
        <ResetPasswordRequestForm />
      ) : (
        <ResetPasswordConfirmForm token={token} />
      )}
    </AuthScaffold>
  );
}
