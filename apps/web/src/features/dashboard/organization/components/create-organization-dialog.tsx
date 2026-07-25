"use client";

import { useApolloClient } from "@apollo/client/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { organizationCreateSchema } from "@vyrel/api/models/organization/types/base.types";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Spinner,
} from "@vyrel/shared/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type z from "zod/v4";

import { OrganizationLogoField } from "@/features/auth/components/organization-logo-field";
import { createOrganization } from "@/features/auth/create-organization";
import {
  onboardingDefaultValues,
  slugifyOrganizationName,
} from "@/features/auth/onboarding-form.schema";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";

const createOrganizationFormSchema = organizationCreateSchema;

type CreateOrganizationFormValues = z.infer<
  typeof createOrganizationFormSchema
>;

const createOrganizationDefaultValues = onboardingDefaultValues;

const CREATE_ORGANIZATION_FORM_ID = "create-organization-form";

export function CreateOrganizationDialog() {
  const client = useApolloClient();
  const [open, setOpen] = useState(false);
  const form = useForm<CreateOrganizationFormValues>({
    defaultValues: createOrganizationDefaultValues,
    resolver: zodResolver(createOrganizationFormSchema),
  });

  const pending = form.formState.isSubmitting;
  const slugIsDirty = form.formState.dirtyFields.slug === true;

  const resetForm = () => {
    form.reset(createOrganizationDefaultValues);
    form.clearErrors();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

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

    await client.refetchQueries({ include: [ListOrganizationsDocument] });
    handleOpenChange(false);
  });

  const logoError = form.formState.errors.logo;
  const nameError = form.formState.errors.name;
  const slugError = form.formState.errors.slug;
  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger
        render={
          <Button>
            <IconPlus className="size-4" />
            New organization
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Add a new workspace for your team.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          id={CREATE_ORGANIZATION_FORM_ID}
          onSubmit={onSubmit}
        >
          <FieldGroup>
            <OrganizationLogoField
              clearErrors={form.clearErrors}
              control={form.control}
              error={logoError}
              formId={CREATE_ORGANIZATION_FORM_ID}
              isSubmitting={pending}
              setError={form.setError}
            />

            <Field data-invalid={nameError !== undefined}>
              <FieldLabel htmlFor={`${CREATE_ORGANIZATION_FORM_ID}-name`}>
                Organization name
              </FieldLabel>
              <Input
                aria-invalid={nameError !== undefined}
                autoComplete="organization"
                id={`${CREATE_ORGANIZATION_FORM_ID}-name`}
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
              <FieldLabel htmlFor={`${CREATE_ORGANIZATION_FORM_ID}-slug`}>
                Slug
              </FieldLabel>
              <Input
                aria-invalid={slugError !== undefined}
                id={`${CREATE_ORGANIZATION_FORM_ID}-slug`}
                placeholder="acme-inc"
                type="text"
                {...form.register("slug")}
              />
              {slugError ? <FieldError errors={[slugError]} /> : null}
            </Field>
          </FieldGroup>

          {rootError !== undefined && rootError.length > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            disabled={pending}
            form={CREATE_ORGANIZATION_FORM_ID}
            type="submit"
          >
            {pending ? <Spinner className="size-4" /> : "Create organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
