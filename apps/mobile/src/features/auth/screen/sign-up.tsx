import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
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
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";

import { authenticate } from "@/features/auth/authenticate";
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

  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const result = await authenticate(values, "signup");

    if (!result.ok) {
      form.setError("root", { message: result.message });
      return;
    }

    const next = await resolvePostAuthRedirect();
    router.replace(next);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-6">
        <Surface className="gap-6 rounded-3xl p-6" variant="secondary">
          <View className="gap-2">
            <Typography.Heading className="text-2xl">
              Create an account
            </Typography.Heading>
            <Typography.Paragraph>
              Start tracking work for your organization.
            </Typography.Paragraph>
          </View>

          <View className="gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  isInvalid={fieldState.error !== undefined}
                  isRequired
                >
                  <Label>Name</Label>
                  <Input
                    autoComplete="name"
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    placeholder="Your name"
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
                <TextField
                  isInvalid={fieldState.error !== undefined}
                  isRequired
                >
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

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <TextField
                  isInvalid={fieldState.error !== undefined}
                  isRequired
                >
                  <Label>Password</Label>
                  <Input
                    autoComplete="new-password"
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    placeholder="••••••••"
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
                <TextField
                  isInvalid={fieldState.error !== undefined}
                  isRequired
                >
                  <Label>Confirm password</Label>
                  <Input
                    autoComplete="new-password"
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    placeholder="••••••••"
                    secureTextEntry
                    value={field.value}
                  />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />

            {rootError === undefined ? null : (
              <Typography className="text-danger text-sm">
                {rootError}
              </Typography>
            )}

            <Button isDisabled={pending} onPress={onSubmit}>
              {pending ? <Spinner color="default" size="sm" /> : null}
              <Button.Label>Create account</Button.Label>
            </Button>

            <Pressable onPress={() => router.push(AUTH_SIGN_IN)}>
              <Typography className="text-center text-sm">
                Already have an account?{" "}
                <Typography className="font-semibold text-accent">
                  Sign in
                </Typography>
              </Typography>
            </Pressable>
          </View>
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}
