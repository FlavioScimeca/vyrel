import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
} from "heroui-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import {
  type CreateTaskFormValues,
  createTaskFormSchema,
} from "@/features/dashboard/task/form.schema";
import { useCreateTaskMutation } from "@/features/dashboard/task/hooks/use-task-mutations";

export function CreateTaskDialog({
  organizationId,
}: {
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [createTask, { loading }] = useCreateTaskMutation();
  const form = useForm<CreateTaskFormValues>({
    defaultValues: {
      description: "",
      title: "",
    },
    resolver: zodResolver(createTaskFormSchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createTask({
      variables: {
        input: {
          description:
            values.description === undefined || values.description.length === 0
              ? undefined
              : values.description,
          organizationId,
          title: values.title,
        },
      },
    });
    form.reset({ description: "", title: "" });
    setOpen(false);
  });

  return (
    <Dialog isOpen={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>
          <Button.Label>New task</Button.Label>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close />
          <Dialog.Title>Create task</Dialog.Title>
          <Dialog.Description>
            Add work for your active organization.
          </Dialog.Description>

          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <TextField isInvalid={fieldState.error !== undefined} isRequired>
                <Label>Title</Label>
                <Input
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  placeholder="Ship mobile parity"
                  value={field.value}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField isInvalid={fieldState.error !== undefined}>
                <Label>Description</Label>
                <Input
                  multiline
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  placeholder="Optional details"
                  value={field.value ?? ""}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          <View className="flex-row justify-end gap-2">
            <Button onPress={() => setOpen(false)} variant="ghost">
              <Button.Label>Cancel</Button.Label>
            </Button>
            <Button isDisabled={loading} onPress={onSubmit}>
              {loading ? <Spinner color="default" size="sm" /> : null}
              <Button.Label>Create</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
