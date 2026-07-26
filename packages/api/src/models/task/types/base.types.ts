import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  task,
  taskLabel,
} from "@vyrel/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod/v4";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const localDateSchema = z
  .string()
  .regex(LOCAL_DATE_PATTERN, "Date must use YYYY-MM-DD")
  .refine((value) => {
    const [yearText, monthText, dayText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Date must be a valid calendar date")
  .meta({ pothosType: "LocalDate" });

export const taskQuerySchema = createSelectSchema(task)
  .omit({
    imageAssetId: true,
    imageFull: true,
    imageThumb: true,
    imagePlaceholder: true,
  })
  .extend({
    dueDate: localDateSchema.nullable(),
  });

const taskInsertSchema = createInsertSchema(task);
const taskLabelInsertSchema = createInsertSchema(taskLabel);

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const taskCreateSchema = taskInsertSchema
  .pick({
    assigneeId: true,
    description: true,
    dueDate: true,
    organizationId: true,
    priority: true,
    status: true,
    title: true,
  })
  .extend({
    assigneeId: z.string().min(1).nullable().optional(),
    description: z.string().trim().optional(),
    dueDate: localDateSchema.nullable().optional(),
    image: z
      .custom<File>((value) => value instanceof File)
      .optional()
      .meta({ pothosType: "File" }),
    labelIds: z.array(z.string().min(1)).max(20).default([]),
    organizationId: z
      .string()
      .min(1, "Organization id is required")
      .meta({ pothosType: "ID" }),
    priority: taskPrioritySchema.default("NONE"),
    status: taskStatusSchema.default("TODO"),
    title: z.string().trim().min(1, "Title is required"),
  });

export const taskUpdateSchema = taskCreateSchema
  .pick({
    description: true,
    assigneeId: true,
    dueDate: true,
    image: true,
    labelIds: true,
    priority: true,
    status: true,
    title: true,
  })
  .partial({
    assigneeId: true,
    description: true,
    dueDate: true,
    labelIds: true,
    priority: true,
    status: true,
    title: true,
  })
  .extend({
    labelIds: z.array(z.string().min(1)).max(20).optional(),
    removeImage: z.boolean().optional(),
    taskId: z.string().min(1, "Task id is required"),
  });

export const taskDeleteSchema = z.object({
  taskId: z.string().min(1, "Task id is required"),
});

export const taskLabelQuerySchema = createSelectSchema(taskLabel);

export const taskLabelCreateSchema = taskLabelInsertSchema
  .pick({
    color: true,
    name: true,
    organizationId: true,
  })
  .extend({
    color: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid label color"),
    name: z.string().trim().min(1).max(32),
    organizationId: z.string().min(1).meta({ pothosType: "ID" }),
  });

export const taskLabelUpdateSchema = taskLabelCreateSchema
  .pick({ color: true, name: true })
  .partial()
  .extend({ labelId: z.string().min(1) });

export const taskLabelDeleteSchema = z.object({
  labelId: z.string().min(1),
});

export type TaskTypeQuery = z.infer<typeof taskQuerySchema>;
export type TaskTypeCreate = z.infer<typeof taskCreateSchema>;
export type TaskTypeUpdate = z.infer<typeof taskUpdateSchema>;
export type TaskTypeDelete = z.infer<typeof taskDeleteSchema>;
export type TaskLabelTypeQuery = z.infer<typeof taskLabelQuerySchema>;
export type TaskLabelTypeCreate = z.infer<typeof taskLabelCreateSchema>;
export type TaskLabelTypeUpdate = z.infer<typeof taskLabelUpdateSchema>;
export type TaskLabelTypeDelete = z.infer<typeof taskLabelDeleteSchema>;
