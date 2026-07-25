import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
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
  type SignUpFormValues,
  signUpDefaultValues,
  signUpFormSchema,
} from "@/features/auth/form.schema";
import { resolvePostAuthRedirect } from "@/features/auth/resolve-post-auth-redirect";
import { AUTH_SIGN_IN } from "@/lib/routes";

export function SignUpScreen() {
  const form = useForm<SignUpFormValues>({
    defaultValues: signUpDefaultValues,
    resolver: zodResolver(signUpFormSchema),
  });
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const result = await authenticate(values, "signup");

    if (!result.ok) {
      form.setError("root", { message: result.message });
      return;
    }

    if (result.requiresVerification === true) {
      router.replace({
        params: { email: values.email },
        pathname: "./verify-email",
      });
      return;
    }

    const next = await resolvePostAuthRedirect();
    router.replace(next);
  });

  return (
    <AuthScaffold
      description="Create your account, then set up a calm workspace for your team."
      showBack
      title="Create account"
    >
      <View className="gap-5">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField isInvalid={fieldState.error !== undefined} isRequired>
              <Label>Name</Label>
              <Input
                autoComplete="name"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                onSubmitEditing={() => emailRef.current?.focus()}
                placeholder="Your name"
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
                ref={emailRef}
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
              autoComplete="new-password"
              error={fieldState.error?.message}
              inputRef={passwordRef}
              label="Password"
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

        <FormAlert message={rootError} />

        <Button isDisabled={pending} onPress={onSubmit} size="lg">
          {pending ? <Spinner color="default" size="sm" /> : null}
          <Button.Label>
            {pending ? "Creating account…" : "Create account"}
          </Button.Label>
        </Button>

        <AuthTextLink onPress={() => router.replace(AUTH_SIGN_IN)}>
          <Typography className="text-center text-sm">
            Already have an account?{" "}
            <Typography className="font-semibold text-accent">
              Sign in
            </Typography>
          </Typography>
        </AuthTextLink>
      </View>
    </AuthScaffold>
  );
}
