import z from "zod/v4";

export const taskByIdSchema = z.object({
  id: z.string().min(1),
});

export const tasksByOrganizationSchema = z.object({
  organizationId: z.string().min(1),
});

export type TaskTypeById = z.infer<typeof taskByIdSchema>;
export type TasksTypeByOrganization = z.infer<typeof tasksByOrganizationSchema>;
