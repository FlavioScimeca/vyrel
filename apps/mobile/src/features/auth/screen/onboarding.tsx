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
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { createOrganization } from "@/features/auth/create-organization";
import {
  type OnboardingFormValues,
  onboardingDefaultValues,
  onboardingFormSchema,
  slugifyOrganizationName,
} from "@/features/auth/onboarding-form.schema";
import { APP_HOME } from "@/lib/routes";

export function OnboardingScreen() {
  const form = useForm<OnboardingFormValues>({
    defaultValues: onboardingDefaultValues,
    resolver: zodResolver(onboardingFormSchema),
  });

  const pending = form.formState.isSubmitting;
  const slugIsDirty = form.formState.dirtyFields.slug === true;
  const rootError = form.formState.errors.root?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    const result = await createOrganization({
      name: values.name,
      slug: values.slug,
    });

    if (!result.ok) {
      form.setError("root", { message: result.message });
      return;
    }

    router.replace(APP_HOME);
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
              Create your organization
            </Typography.Heading>
            <Typography.Paragraph>
              You need a workspace before using the dashboard.
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
                  <Label>Organization name</Label>
                  <Input
                    onBlur={field.onBlur}
                    onChangeText={(value) => {
                      field.onChange(value);
                      if (!slugIsDirty) {
                        form.setValue("slug", slugifyOrganizationName(value), {
                          shouldValidate: true,
                        });
                      }
                    }}
                    placeholder="Acme Inc"
                    value={field.value}
                  />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />

            <Controller
              control={form.control}
              name="slug"
              render={({ field, fieldState }) => (
                <TextField
                  isInvalid={fieldState.error !== undefined}
                  isRequired
                >
                  <Label>Slug</Label>
                  <Input
                    autoCapitalize="none"
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    placeholder="acme-inc"
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
              <Button.Label>Continue</Button.Label>
            </Button>
          </View>
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}
