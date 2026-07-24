import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  FieldError,
  Input,
  Label,
  Spinner,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, View } from "react-native";

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
  const rootError = form.formState.errors.root?.message;

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
      <View className="gap-4">
        <Typography.Heading className="text-xl">
          Check your email
        </Typography.Heading>
        <Typography.Paragraph>
          If an account exists for that address, we sent a reset link.
        </Typography.Paragraph>
        <Button
          onPress={() => router.replace(AUTH_SIGN_IN)}
          variant="secondary"
        >
          <Button.Label>Back to sign in</Button.Label>
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Typography.Heading className="text-2xl">
          Reset password
        </Typography.Heading>
        <Typography.Paragraph>
          Enter your email and we will send a reset link.
        </Typography.Paragraph>
      </View>

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
              placeholder="you@example.com"
              value={field.value}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      {rootError === undefined ? null : (
        <Typography className="text-danger text-sm">{rootError}</Typography>
      )}

      <Button isDisabled={pending} onPress={onSubmit}>
        {pending ? <Spinner color="default" size="sm" /> : null}
        <Button.Label>Send reset link</Button.Label>
      </Button>
    </View>
  );
}

function ResetPasswordConfirmForm({ token }: { token: string }) {
  const form = useForm<ResetPasswordValues>({
    defaultValues: resetPasswordDefaultValues,
    resolver: zodResolver(resetPasswordSchema),
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

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
    <View className="gap-4">
      <View className="gap-2">
        <Typography.Heading className="text-2xl">
          Choose a new password
        </Typography.Heading>
        <Typography.Paragraph>
          Enter and confirm your new password.
        </Typography.Paragraph>
      </View>

      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField isInvalid={fieldState.error !== undefined} isRequired>
            <Label>New password</Label>
            <Input
              autoComplete="new-password"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              secureTextEntry
              value={field.value}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <TextField isInvalid={fieldState.error !== undefined} isRequired>
            <Label>Confirm password</Label>
            <Input
              autoComplete="new-password"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              secureTextEntry
              value={field.value}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      {rootError === undefined ? null : (
        <Typography className="text-danger text-sm">{rootError}</Typography>
      )}

      <Button isDisabled={pending} onPress={onSubmit}>
        {pending ? <Spinner color="default" size="sm" /> : null}
        <Button.Label>Update password</Button.Label>
      </Button>
    </View>
  );
}

export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : undefined;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-6">
        <Surface className="gap-6 rounded-3xl p-6" variant="secondary">
          {token === undefined ? (
            <ResetPasswordRequestForm />
          ) : (
            <ResetPasswordConfirmForm token={token} />
          )}
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}
