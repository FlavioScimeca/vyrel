import { user } from "@vyrel/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod/v4";

export const userQuerySchema = createSelectSchema(user).omit({
  id: true,
  imageAssetId: true,
  imageFull: true,
  imageThumb: true,
});

const userInsertSchema = createInsertSchema(user);

export const userCreateSchema = userInsertSchema
  .pick({
    email: true,
    name: true,
  })
  .extend({
    avatar: z
      .custom<File>((value) => value instanceof File)
      .optional()
      .meta({ pothosType: "File" }),
    email: z.email("Enter a valid email address"),
    name: z.string().trim().min(1, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

export const userUpdateSchema = userCreateSchema
  .pick({
    avatar: true,
    name: true,
  })
  .partial({
    name: true,
  });

export const userDeleteSchema = z.object({
  callbackURL: z.string().optional(),
  password: z.string().min(1).optional(),
  token: z.string().optional(),
});

export type UserTypeUpdate = z.infer<typeof userUpdateSchema>;
export type UserTypeDelete = z.infer<typeof userDeleteSchema>;
export type UserTypeCreate = z.infer<typeof userCreateSchema>;
