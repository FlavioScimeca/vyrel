import { useMutation } from "@apollo/client/react";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { CreateTaskDocument } from "@/src/features/dashboard/task/graphql/mutations";
import { TaskSummaryDocument } from "@/src/features/dashboard/task/graphql/queries";

const createTaskFormSchema = taskCreateSchema.omit({
  assigneeId: true,
  dueDate: true,
  image: true,
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

const CREATE_TASK_FORM_ID = "extension-create-task-form";

type CreateTaskDialogProps = {
  organizationId: string;
};

export function CreateTaskDialog({ organizationId }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [createTask] = useMutation(CreateTaskDocument, {
    refetchQueries: [
      {
        query: TaskSummaryDocument,
        variables: { organizationId },
      },
    ],
  });
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

    try {
      await createTask({
        variables: {
          input: {
            description:
              values.description !== undefined && values.description.length > 0
                ? values.description
                : undefined,
            organizationId,
            title: values.title,
          },
        },
      });
      handleOpenChange(false);
    } catch (createError) {
      form.setError("root", {
        message:
          createError instanceof Error
            ? createError.message
            : "Failed to create task",
      });
    }
  });

  const titleError = form.formState.errors.title;
  const descriptionError = form.formState.errors.description;
  const rootError = form.formState.errors.root;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger render={<Button className="w-full" type="button" />}>
        Create task
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a new task to the active organization.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          id={CREATE_TASK_FORM_ID}
          onSubmit={onSubmit}
        >
          <FieldGroup>
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

          {rootError?.message ? (
            <p className="text-destructive text-xs">{rootError.message}</p>
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
