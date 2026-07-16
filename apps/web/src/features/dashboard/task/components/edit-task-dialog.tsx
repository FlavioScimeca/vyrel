"use client";

import { useMutation } from "@apollo/client/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil } from "@tabler/icons-react";
import { taskUpdateSchema } from "@vyrel/api/models/task/types/base.types";
import { readFragment } from "gql.tada";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod/v4";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TaskImageField } from "@/features/dashboard/task/components/task-image-field";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import { UpdateTaskDocument } from "@/features/dashboard/task/graphql/mutations";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";

const editTaskFormSchema = taskUpdateSchema.omit({ taskId: true }).extend({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
});

type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;

const EDIT_TASK_FORM_ID = "edit-task-form";

type EditTaskDialogProps = {
  onUpdated?: () => void;
  task: TaskListItemRef;
};

export function EditTaskDialog({ onUpdated, task }: EditTaskDialogProps) {
  const item = readFragment(TaskListItemFragment, task);
  const [open, setOpen] = useState(false);
  const [updateTask, { loading: mutationPending }] =
    useMutation(UpdateTaskDocument);

  const form = useForm<EditTaskFormValues>({
    defaultValues: {
      description: item.description ?? "",
      title: item.title,
    },
    resolver: zodResolver(editTaskFormSchema),
  });

  const pending = form.formState.isSubmitting || mutationPending;

  useEffect(() => {
    if (open) {
      form.reset({
        description: item.description ?? "",
        title: item.title,
      });
    }
  }, [form, item.description, item.title, open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        form.clearErrors();
      }
    },
    [form]
  );

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    try {
      const result = await updateTask({
        variables: {
          input: {
            description:
              values.description !== undefined && values.description.length > 0
                ? values.description
                : undefined,
            image: values.image,
            taskId: item.id,
            title: values.title,
          },
        },
      });

      if (result.error !== undefined) {
        form.setError("root", {
          message: result.error.message || "Unable to update task.",
        });
        return;
      }

      handleOpenChange(false);
      onUpdated?.();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Unable to update task.",
      });
    }
  });

  const imageError = form.formState.errors.image;
  const titleError = form.formState.errors.title;
  const descriptionError = form.formState.errors.description;
  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger
        render={
          <Button aria-label="Edit task" size="icon-sm" variant="ghost">
            <IconPencil className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update this task’s details.</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          id={EDIT_TASK_FORM_ID}
          onSubmit={onSubmit}
        >
          <FieldGroup>
            <TaskImageField
              clearErrors={form.clearErrors}
              control={form.control}
              error={imageError}
              formId={EDIT_TASK_FORM_ID}
              isSubmitting={pending}
              setError={form.setError}
            />

            <Field data-invalid={titleError !== undefined}>
              <FieldLabel htmlFor={`${EDIT_TASK_FORM_ID}-title`}>
                Title
              </FieldLabel>
              <Input
                aria-invalid={titleError !== undefined}
                id={`${EDIT_TASK_FORM_ID}-title`}
                placeholder="Ship the new feature"
                type="text"
                {...form.register("title")}
              />
              {titleError ? <FieldError errors={[titleError]} /> : null}
            </Field>

            <Field data-invalid={descriptionError !== undefined}>
              <FieldLabel htmlFor={`${EDIT_TASK_FORM_ID}-description`}>
                Description
              </FieldLabel>
              <Textarea
                aria-invalid={descriptionError !== undefined}
                id={`${EDIT_TASK_FORM_ID}-description`}
                placeholder="Optional details…"
                rows={3}
                {...form.register("description")}
              />
              {descriptionError ? (
                <FieldError errors={[descriptionError]} />
              ) : null}
            </Field>
          </FieldGroup>

          {rootError !== undefined && rootError.length > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          ) : null}
        </form>

        <DialogFooter>
          <Button disabled={pending} form={EDIT_TASK_FORM_ID} type="submit">
            {pending ? <Spinner className="size-4" /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
