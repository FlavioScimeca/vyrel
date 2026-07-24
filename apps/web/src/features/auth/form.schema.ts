import { userCreateSchema } from "@vyrel/api/models/user/types/base.types";
import z from "zod/v4";

export type AuthMode = "signin" | "signup";

export const signInFormSchema = userCreateSchema.pick({
  email: true,
  password: true,
});

export const signUpFormSchema = userCreateSchema
  .extend({
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInFormValues = z.infer<typeof signInFormSchema>;
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export const resetPasswordRequestSchema = signInFormSchema.pick({
  email: true,
});

export const resetPasswordSchema = z
  .object({
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordRequestValues = z.infer<
  typeof resetPasswordRequestSchema
>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const resetPasswordRequestDefaultValues: ResetPasswordRequestValues = {
  email: "",
};

export const resetPasswordDefaultValues: ResetPasswordValues = {
  confirmPassword: "",
  password: "",
};

export const signInDefaultValues: SignInFormValues = {
  email: "",
  password: "",
};

export const signUpDefaultValues: SignUpFormValues = {
  confirmPassword: "",
  email: "",
  name: "",
  password: "",
};

export function parseAuthMode(value: string | null): AuthMode {
  return value === "signup" ? "signup" : "signin";
}
