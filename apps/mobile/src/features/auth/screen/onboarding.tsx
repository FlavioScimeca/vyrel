import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
} from "heroui-native";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { type TextInput, View } from "react-native";

import {
  AuthScaffold,
  FormAlert,
} from "@/features/auth/components/auth-scaffold";
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
  const slugRef = useRef<TextInput>(null);
  const pending = form.formState.isSubmitting;
  const slugIsDirty = form.formState.dirtyFields.slug === true;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const result = await createOrganization(values);

    if (!result.ok) {
      form.setError("root", { message: result.message });
      return;
    }
    router.replace(APP_HOME);
  });

  return (
    <AuthScaffold
      description="Give your team a home. You can invite people and change these details later."
      title="Create a workspace"
    >
      <View className="gap-5">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField isInvalid={fieldState.error !== undefined} isRequired>
              <Label>Workspace name</Label>
              <Input
                autoComplete="organization"
                onBlur={field.onBlur}
                onChangeText={(value) => {
                  field.onChange(value);
                  if (!slugIsDirty) {
                    form.setValue("slug", slugifyOrganizationName(value), {
                      shouldValidate: true,
                    });
                  }
                }}
                onSubmitEditing={() => slugRef.current?.focus()}
                placeholder="Acme Studio"
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
          name="slug"
          render={({ field, fieldState }) => (
            <TextField isInvalid={fieldState.error !== undefined} isRequired>
              <Label>Workspace URL</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                onSubmitEditing={onSubmit}
                placeholder="acme-studio"
                ref={slugRef}
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                value={field.value}
              />
              <Description>
                vyrel.app/{field.value || "your-workspace"}
              </Description>
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <FormAlert message={form.formState.errors.root?.message} />

        <Button isDisabled={pending} onPress={onSubmit} size="lg">
          {pending ? <Spinner color="default" size="sm" /> : null}
          <Button.Label>
            {pending ? "Creating workspace…" : "Create workspace"}
          </Button.Label>
        </Button>
      </View>
    </AuthScaffold>
  );
}
