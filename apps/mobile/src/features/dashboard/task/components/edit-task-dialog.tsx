import { zodResolver } from "@hookform/resolvers/zod";
import { readFragment } from "gql.tada";
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
  type EditTaskFormValues,
  editTaskFormSchema,
} from "@/features/dashboard/task/form.schema";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { useUpdateTaskMutation } from "@/features/dashboard/task/hooks/use-task-mutations";

export function EditTaskDialog({ task }: { task: TaskListItemRef }) {
  const item = readFragment(TaskListItemFragment, task);
  const [open, setOpen] = useState(false);
  const [updateTask, { loading }] = useUpdateTaskMutation(item);
  const form = useForm<EditTaskFormValues>({
    defaultValues: {
      description: item.description ?? "",
      taskId: item.id,
      title: item.title,
    },
    resolver: zodResolver(editTaskFormSchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await updateTask({
      variables: {
        input: {
          description: values.description,
          taskId: item.id,
          title: values.title,
        },
      },
    });
    setOpen(false);
  });

  return (
    <Dialog isOpen={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="ghost">
          <Button.Label>Edit</Button.Label>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close />
          <Dialog.Title>Edit task</Dialog.Title>

          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <TextField isInvalid={fieldState.error !== undefined} isRequired>
                <Label>Title</Label>
                <Input
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  value={field.value ?? ""}
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
              <Button.Label>Save</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
