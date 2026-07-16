import { userCreateSchema } from "@vyrel/api/models/user/types/base.types";
import z from "zod/v4";

export type AuthMode = "signin" | "signup";

const signInFormSchema = userCreateSchema
  .pick({
    email: true,
    password: true,
  })
  .extend({
    mode: z.literal("signin"),
  });

const signUpFormSchema = userCreateSchema
  .extend({
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    mode: z.literal("signup"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const authFormSchema = z.discriminatedUnion("mode", [
  signInFormSchema,
  signUpFormSchema,
]);

export type SignInFormValues = z.infer<typeof signInFormSchema>;
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
export type AuthFormValues = z.infer<typeof authFormSchema>;

export const signInDefaultValues: SignInFormValues = {
  email: "",
  mode: "signin",
  password: "",
};

export const signUpDefaultValues: SignUpFormValues = {
  confirmPassword: "",
  email: "",
  mode: "signup",
  name: "",
  password: "",
};

export function parseAuthMode(value: string | null): AuthMode {
  return value === "signup" ? "signup" : "signin";
}
