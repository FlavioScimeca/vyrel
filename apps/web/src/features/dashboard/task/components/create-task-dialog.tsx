"use client";

import { useMutation } from "@apollo/client/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { taskCreateSchema } from "@vyrel/api/models/task/types/base.types";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import type z from "zod/v4";

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
import { CreateTaskDocument } from "@/features/dashboard/task/graphql/mutations";

const createTaskFormSchema = taskCreateSchema.omit({ organizationId: true });

type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

const createTaskDefaultValues: CreateTaskFormValues = {
  description: "",
  title: "",
};

const CREATE_TASK_FORM_ID = "create-task-form";

type CreateTaskDialogProps = {
  onCreated?: () => void;
  organizationId: string;
};

export function CreateTaskDialog({
  onCreated,
  organizationId,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [createTask, { loading: mutationPending }] =
    useMutation(CreateTaskDocument);
  const form = useForm<CreateTaskFormValues>({
    defaultValues: createTaskDefaultValues,
    resolver: zodResolver(createTaskFormSchema),
  });

  const pending = form.formState.isSubmitting || mutationPending;

  const resetForm = useCallback(() => {
    form.reset(createTaskDefaultValues);
    form.clearErrors();
  }, [form]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        resetForm();
      }
    },
    [resetForm]
  );

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    try {
      const result = await createTask({
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

      if (result.error !== undefined) {
        form.setError("root", {
          message: result.error.message || "Unable to create task.",
        });
        return;
      }

      handleOpenChange(false);
      onCreated?.();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Unable to create task.",
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

          {rootError !== undefined && rootError.length > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          ) : null}
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
