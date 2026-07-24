import z from "zod/v4";

export const createTaskFormSchema = z.object({
  description: z.string().trim().optional(),
  title: z.string().trim().min(1, "Title is required"),
});

export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

export const editTaskFormSchema = z.object({
  description: z.string().trim().optional(),
  taskId: z.string().min(1, "Task id is required"),
  title: z.string().trim().min(1, "Title is required").optional(),
});

export type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;
