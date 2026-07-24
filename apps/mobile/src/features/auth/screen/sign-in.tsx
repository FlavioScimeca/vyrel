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
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { type TextInput, View } from "react-native";

import { authenticate } from "@/features/auth/authenticate";
import {
  AuthScaffold,
  AuthTextLink,
  FormAlert,
} from "@/features/auth/components/auth-scaffold";
import { PasswordField } from "@/features/auth/components/password-field";
import {
  type SignInFormValues,
  signInDefaultValues,
  signInFormSchema,
} from "@/features/auth/form.schema";
import { resolvePostAuthRedirect } from "@/features/auth/resolve-post-auth-redirect";
import {
  AUTH_RESET_PASSWORD,
  AUTH_SIGN_UP,
  invitationRoute,
} from "@/lib/routes";

export function SignInScreen() {
  const { invitationId } = useLocalSearchParams<{ invitationId?: string }>();
  const form = useForm<SignInFormValues>({
    defaultValues: signInDefaultValues,
    resolver: zodResolver(signInFormSchema),
  });

  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;
  const passwordRef = useRef<TextInput>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const result = await authenticate(values, "signin");

    if (!result.ok) {
      if (result.requiresVerification === true) {
        router.replace({
          params: { email: values.email },
          pathname: "./verify-email",
        });
        return;
      }

      form.setError("root", { message: result.message });
      return;
    }

    if (invitationId === undefined) {
      const next = await resolvePostAuthRedirect();
      router.replace(next);
    } else {
      router.replace(invitationRoute(invitationId));
    }
  });

  return (
    <AuthScaffold
      description="Pick up where you left off and keep your team moving."
      title="Welcome back"
    >
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
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="you@example.com"
                returnKeyType="next"
                submitBehavior="submit"
                value={field.value}
              />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <PasswordField
              autoComplete="current-password"
              error={fieldState.error?.message}
              inputRef={passwordRef}
              label="Password"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              onSubmitEditing={onSubmit}
              returnKeyType="done"
              value={field.value}
            />
          )}
        />

        <FormAlert message={rootError} />

        <Button isDisabled={pending} onPress={onSubmit} size="lg">
          {pending ? <Spinner color="default" size="sm" /> : null}
          <Button.Label>{pending ? "Signing in…" : "Sign in"}</Button.Label>
        </Button>

        <AuthTextLink onPress={() => router.push(AUTH_RESET_PASSWORD)}>
          <Typography className="text-center text-muted text-sm">
            Forgot password?
          </Typography>
        </AuthTextLink>

        <AuthTextLink onPress={() => router.push(AUTH_SIGN_UP)}>
          <Typography className="text-center text-sm">
            New to Vyrel?{" "}
            <Typography className="font-semibold text-accent">
              Create an account
            </Typography>
          </Typography>
        </AuthTextLink>
      </View>
    </AuthScaffold>
  );
}
