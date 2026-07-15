"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { OrganizationLogoField } from "@/features/auth/components/organization-logo-field";
import { createOrganization } from "@/features/auth/create-organization";
import {
  type OnboardingFormValues,
  onboardingDefaultValues,
  onboardingFormSchema,
  slugifyOrganizationName,
} from "@/features/auth/onboarding-form.schema";

const ONBOARDING_FORM_ID = "onboarding-form";

export function OnboardingScreen() {
  const form = useForm<OnboardingFormValues>({
    defaultValues: onboardingDefaultValues,
    resolver: zodResolver(onboardingFormSchema),
  });

  const pending = form.formState.isSubmitting;
  const slugIsDirty = form.formState.dirtyFields.slug === true;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    const result = await createOrganization({
      logo: values.logo,
      name: values.name,
      slug: values.slug,
    });

    if (!result.ok) {
      form.setError("root", {
        message: result.message,
      });
      return;
    }

    window.location.assign("/dashboard");
  });

  const logoError = form.formState.errors.logo;
  const nameError = form.formState.errors.name;
  const slugError = form.formState.errors.slug;

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl tracking-tight">
            Create your organization
          </CardTitle>
          <CardDescription>
            Set up your workspace to get started.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="flex flex-col gap-4"
            id={ONBOARDING_FORM_ID}
            onSubmit={onSubmit}
          >
            <FieldGroup>
              <OrganizationLogoField
                clearErrors={form.clearErrors}
                control={form.control}
                error={logoError}
                formId={ONBOARDING_FORM_ID}
                isSubmitting={pending}
                setError={form.setError}
              />

              <Field data-invalid={nameError !== undefined}>
                <FieldLabel htmlFor={`${ONBOARDING_FORM_ID}-name`}>
                  Organization name
                </FieldLabel>
                <Input
                  aria-invalid={nameError !== undefined}
                  autoComplete="organization"
                  id={`${ONBOARDING_FORM_ID}-name`}
                  placeholder="Acme Inc."
                  type="text"
                  {...form.register("name", {
                    onChange: (event) => {
                      if (!slugIsDirty) {
                        form.setValue(
                          "slug",
                          slugifyOrganizationName(event.target.value),
                          {
                            shouldDirty: false,
                            shouldValidate: true,
                          }
                        );
                      }
                    },
                  })}
                />
                {nameError ? <FieldError errors={[nameError]} /> : null}
              </Field>

              <Field data-invalid={slugError !== undefined}>
                <FieldLabel htmlFor={`${ONBOARDING_FORM_ID}-slug`}>
                  Slug
                </FieldLabel>
                <Input
                  aria-invalid={slugError !== undefined}
                  id={`${ONBOARDING_FORM_ID}-slug`}
                  placeholder="acme-inc"
                  type="text"
                  {...form.register("slug")}
                />
                {slugError ? <FieldError errors={[slugError]} /> : null}
              </Field>
            </FieldGroup>

            <FormRootError message={form.formState.errors.root?.message} />

            <Button
              disabled={pending}
              onClick={onSubmit}
              size="lg"
              type="button"
            >
              {pending ? <Spinner className="size-4" /> : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FormRootError({ message }: { message?: string }) {
  if (message === undefined || message.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
