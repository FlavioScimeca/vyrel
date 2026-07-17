import { organization } from "@vyrel/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod/v4";

export const organizationQuerySchema = createSelectSchema(organization).omit({
  imageAssetId: true,
  imageFull: true,
  imageThumb: true,
  imagePlaceholder: true,
});

const organizationInsertSchema = createInsertSchema(organization);

export const organizationCreateSchema = organizationInsertSchema
  .pick({
    name: true,
    slug: true,
  })
  .extend({
    logo: z
      .custom<File>((value) => value instanceof File)
      .optional()
      .meta({ pothosType: "File" }),
    name: z.string().trim().min(1, "Name is required"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens"
      ),
  });

export const organizationUpdateSchema = organizationCreateSchema
  .pick({
    logo: true,
    name: true,
    slug: true,
  })
  .partial({
    name: true,
    slug: true,
  })
  .extend({
    organizationId: z.string().min(1, "Organization id is required"),
  });

export const organizationDeleteSchema = z.object({
  organizationId: z.string().min(1, "Organization id is required"),
});

export type OrganizationTypeCreate = z.infer<typeof organizationCreateSchema>;
export type OrganizationTypeUpdate = z.infer<typeof organizationUpdateSchema>;
export type OrganizationTypeDelete = z.infer<typeof organizationDeleteSchema>;
