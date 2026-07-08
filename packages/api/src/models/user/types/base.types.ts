import { user } from "@vyrel/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod/v4";

export const userQuerySchema = createSelectSchema(user);

const userInsertSchema = createInsertSchema(user);

export const userCreateSchema = userInsertSchema
  .pick({
    email: true,
    name: true,
    printifyToken: true,
  })
  .extend({
    avatar: z.custom<File>((value) => value instanceof File).optional(),
    callbackURL: z.url().optional(),
    email: z.email("Enter a valid email address"),
    name: z.string().trim().min(1, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    printifyToken: z.string().trim().min(1, "Printify API token is required"),
  });

export const userByIdSchema = z.object({
  id: z.string().min(1),
});

export const userUpdateSchema = userCreateSchema
  .pick({ name: true, printifyToken: true })
  .partial()
  .extend({
    imageAssetId: z.string().nullish(),
    imageFull: z.string().nullish(),
    imagePlaceholder: z.string().nullish(),
    imageThumb: z.string().nullish(),
  });

export const userDeleteSchema = z.object({
  callbackURL: z.string().optional(),
  password: z.string().min(1).optional(),
  token: z.string().optional(),
});

export type UserTypeUpdate = z.infer<typeof userUpdateSchema>;
export type UserTypeDelete = z.infer<typeof userDeleteSchema>;
export type UserTypeById = z.infer<typeof userByIdSchema>;
export type UserTypeCreate = z.infer<typeof userCreateSchema>;
