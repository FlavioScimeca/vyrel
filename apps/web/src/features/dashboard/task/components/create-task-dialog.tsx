"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { taskCreateSchema } from "@vyrel/api/models/task/types/base.types";
import {
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
  Textarea,
} from "@vyrel/shared/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type z from "zod/v4";

import { TaskImageField } from "@/features/dashboard/task/components/task-image-field";
import { useCreateTaskMutation } from "@/features/dashboard/task/hooks/use-task-mutations";

const createTaskFormSchema = taskCreateSchema.omit({
  assigneeId: true,
  dueDate: true,
  labelIds: true,
  organizationId: true,
  priority: true,
  status: true,
});

type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

const createTaskDefaultValues: CreateTaskFormValues = {
  description: "",
  title: "",
};

const CREATE_TASK_FORM_ID = "create-task-form";

type CreateTaskDialogProps = {
  organizationId: string;
};

export function CreateTaskDialog({ organizationId }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [createTask] = useCreateTaskMutation();
  const form = useForm<CreateTaskFormValues>({
    defaultValues: createTaskDefaultValues,
    resolver: zodResolver(createTaskFormSchema),
  });

  const pending = form.formState.isSubmitting;

  const resetForm = () => {
    form.reset(createTaskDefaultValues);
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

    const mutation = createTask({
      variables: {
        input: {
          description:
            values.description !== undefined && values.description.length > 0
              ? values.description
              : undefined,
          image: values.image,
          organizationId,
          title: values.title,
        },
      },
    });
    handleOpenChange(false);

    try {
      // Mutation response already includes signed image URLs via Task field
      // resolvers — no list refetch (avoids a second cache rewrite / UI flick).
      await mutation;
    } catch {
      // Mutation errors use its toast.
    }
  });

  const imageError = form.formState.errors.image;
  const titleError = form.formState.errors.title;
  const descriptionError = form.formState.errors.description;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger
        render={
          <Button>
            <IconPlus className="size-4" />
            New task
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a new task to your organization.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          id={CREATE_TASK_FORM_ID}
          onSubmit={onSubmit}
        >
          <FieldGroup>
            <TaskImageField
              clearErrors={form.clearErrors}
              control={form.control}
              error={imageError}
              formId={CREATE_TASK_FORM_ID}
              isSubmitting={pending}
              setError={form.setError}
            />

            <Field data-invalid={titleError !== undefined}>
              <FieldLabel htmlFor={`${CREATE_TASK_FORM_ID}-title`}>
                Title
              </FieldLabel>
              <Input
                aria-invalid={titleError !== undefined}
                id={`${CREATE_TASK_FORM_ID}-title`}
                placeholder="Ship the new feature"
                type="text"
                {...form.register("title")}
              />
              {titleError ? <FieldError errors={[titleError]} /> : null}
            </Field>

            <Field data-invalid={descriptionError !== undefined}>
              <FieldLabel htmlFor={`${CREATE_TASK_FORM_ID}-description`}>
                Description
              </FieldLabel>
              <Textarea
                aria-invalid={descriptionError !== undefined}
                id={`${CREATE_TASK_FORM_ID}-description`}
                placeholder="Optional details…"
                rows={3}
                {...form.register("description")}
              />
              {descriptionError ? (
                <FieldError errors={[descriptionError]} />
              ) : null}
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button disabled={pending} form={CREATE_TASK_FORM_ID} type="submit">
            {pending ? <Spinner className="size-4" /> : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
