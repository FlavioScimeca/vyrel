import z from "zod/v4";

export const organizationByIdSchema = z.object({
  id: z.string().min(1),
});

export type OrganizationTypeById = z.infer<typeof organizationByIdSchema>;
