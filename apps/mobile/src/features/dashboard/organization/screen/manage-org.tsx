import { useQuery } from "@apollo/client/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { readFragment } from "gql.tada";
import {
  Button,
  Dialog,
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
import { ScrollView, View } from "react-native";

import { createOrganization } from "@/features/auth/create-organization";
import {
  type OnboardingFormValues,
  onboardingFormSchema,
  slugifyOrganizationName,
} from "@/features/auth/onboarding-form.schema";
import {
  OrganizationListItemFragment,
  type OrganizationListItemRef,
} from "@/features/dashboard/organization/graphql/fragments";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";
import { formatMediumDate } from "@/lib/format-date";

function CreateOrganizationDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<OnboardingFormValues>({
    defaultValues: { name: "", slug: "" },
    resolver: zodResolver(onboardingFormSchema),
  });
  const pending = form.formState.isSubmitting;
  const slugIsDirty = form.formState.dirtyFields.slug === true;
  const rootError = form.formState.errors.root?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const result = await createOrganization(values);
    if (!result.ok) {
      form.setError("root", { message: result.message });
      return;
    }
    form.reset({ name: "", slug: "" });
    setOpen(false);
    onCreated();
  });

  return (
    <Dialog isOpen={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>
          <Button.Label>New organization</Button.Label>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close />
          <Dialog.Title>Create organization</Dialog.Title>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField isInvalid={fieldState.error !== undefined} isRequired>
                <Label>Name</Label>
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
                <Label>Slug</Label>
                <Input
                  autoCapitalize="none"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
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
            <Button.Label>Create</Button.Label>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

function OrganizationCard({
  organization,
}: {
  organization: OrganizationListItemRef;
}) {
  const org = readFragment(OrganizationListItemFragment, organization);

  return (
    <Surface className="gap-1 rounded-2xl p-4" variant="secondary">
      <Typography className="font-semibold text-base">{org.name}</Typography>
      <Typography className="text-muted text-sm">{org.slug}</Typography>
      <Typography className="text-muted text-xs">
        Created {formatMediumDate(org.createdAt)}
      </Typography>
    </Surface>
  );
}

export function ManageOrgScreen() {
  const { data, error, loading, refetch } = useQuery(ListOrganizationsDocument);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Typography.Heading className="text-2xl">
            Organizations
          </Typography.Heading>
          <Typography.Paragraph>
            View and manage your workspaces.
          </Typography.Paragraph>
        </View>
        <CreateOrganizationDialog onCreated={() => refetch()} />
      </View>

      {loading && data === undefined ? (
        <View className="items-center py-10">
          <Spinner />
        </View>
      ) : null}

      {error === undefined ? null : (
        <Typography className="text-danger">
          Unable to load organizations.
        </Typography>
      )}

      <View className="gap-3">
        {(data?.organizations ?? []).map((organization) => {
          const org = readFragment(OrganizationListItemFragment, organization);
          return <OrganizationCard key={org.id} organization={organization} />;
        })}
      </View>
    </ScrollView>
  );
}
