import z from "zod/v4";

export const userByIdSchema = z.object({
  id: z.string().min(1),
});

export type UserTypeById = z.infer<typeof userByIdSchema>;
