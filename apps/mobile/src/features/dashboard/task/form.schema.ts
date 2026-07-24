import z from "zod/v4";

export const createTaskFormSchema = z.object({
  assigneeId: z.string().optional(),
  description: z.string().trim().optional(),
  dueDate: z.string().optional(),
  labelIds: z.array(z.string()),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  title: z.string().trim().min(1, "Title is required"),
});

export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

export const editTaskFormSchema = z.object({
  description: z.string().trim().optional(),
  taskId: z.string().min(1, "Task id is required"),
  title: z.string().trim().min(1, "Title is required").optional(),
});

export type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;
