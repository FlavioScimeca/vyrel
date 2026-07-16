import { task } from "@vyrel/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod/v4";

export const taskQuerySchema = createSelectSchema(task).omit({
  imageAssetId: true,
  imageFull: true,
  imageThumb: true,
  imagePlaceholder: true,
});

const taskInsertSchema = createInsertSchema(task);

export const taskCreateSchema = taskInsertSchema
  .pick({
    description: true,
    organizationId: true,
    title: true,
  })
  .extend({
    description: z.string().trim().optional(),
    image: z
      .custom<File>((value) => value instanceof File)
      .optional()
      .meta({ pothosType: "File" }),
    organizationId: z.string().min(1, "Organization id is required"),
    title: z.string().trim().min(1, "Title is required"),
  });

export const taskUpdateSchema = taskCreateSchema
  .pick({
    description: true,
    image: true,
    title: true,
  })
  .partial({
    description: true,
    title: true,
  })
  .extend({
    taskId: z.string().min(1, "Task id is required"),
  });

export const taskDeleteSchema = z.object({
  taskId: z.string().min(1, "Task id is required"),
});

export type TaskTypeCreate = z.infer<typeof taskCreateSchema>;
export type TaskTypeUpdate = z.infer<typeof taskUpdateSchema>;
export type TaskTypeDelete = z.infer<typeof taskDeleteSchema>;
