import z from "zod/v4";

import {
  localDateSchema,
  taskPrioritySchema,
  taskStatusSchema,
} from "./base.types";

export const TASK_SORTS = [
  "NEWEST",
  "RECENTLY_UPDATED",
  "DUE_DATE",
  "PRIORITY",
] as const;

export const taskByIdSchema = z.object({
  id: z.string().min(1),
});

/** Plain object shape for GraphQL list args (morph). */
export const taskListFiltersSchema = z.object({
  assigneeId: z.string().min(1).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  dueFrom: localDateSchema.optional(),
  dueTo: localDateSchema.optional(),
  labelIds: z.array(z.string().min(1)).max(20).optional(),
  priorities: z.array(taskPrioritySchema).optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(TASK_SORTS).default("NEWEST"),
  statuses: z.array(taskStatusSchema).optional(),
});

export const taskListGraphqlFiltersSchema = taskListFiltersSchema.omit({
  labelIds: true,
  priorities: true,
  statuses: true,
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
  })
  .refine(
    (value) =>
      value.dueFrom === undefined ||
      value.dueTo === undefined ||
      value.dueFrom <= value.dueTo,
    {
      message: "dueFrom must be on or before dueTo",
      path: ["dueFrom"],
    }
  );

export const taskConnectionSchema = tasksByOrganizationSchema.extend({
  after: z.string().optional(),
  first: z.number().int().min(1).max(100).default(30),
});

export type TaskTypeById = z.infer<typeof taskByIdSchema>;
export type TaskListFilters = z.infer<typeof taskListFiltersSchema>;
export type TasksTypeByOrganization = z.infer<typeof tasksByOrganizationSchema>;
export type TaskConnectionInput = z.infer<typeof taskConnectionSchema>;
