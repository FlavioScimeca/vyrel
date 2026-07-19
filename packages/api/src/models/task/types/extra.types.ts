import z from "zod/v4";

export const taskByIdSchema = z.object({
  id: z.string().min(1),
});

/** Plain object shape for GraphQL list args (morph). */
export const taskListFiltersSchema = z.object({
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
});

const createdFromBeforeCreatedTo = (value: {
  createdFrom?: Date | undefined;
  createdTo?: Date | undefined;
}): boolean => {
  if (value.createdFrom === undefined || value.createdTo === undefined) {
    return true;
  }
  return value.createdFrom.getTime() <= value.createdTo.getTime();
};

export const tasksByOrganizationSchema = z
  .object({
    organizationId: z.string().min(1),
  })
  .extend(taskListFiltersSchema.shape)
  .refine(createdFromBeforeCreatedTo, {
    message: "createdFrom must be on or before createdTo",
    path: ["createdFrom"],
  });

export type TaskTypeById = z.infer<typeof taskByIdSchema>;
export type TaskListFilters = z.infer<typeof taskListFiltersSchema>;
export type TasksTypeByOrganization = z.infer<typeof tasksByOrganizationSchema>;
