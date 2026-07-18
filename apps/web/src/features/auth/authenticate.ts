import { createAccount } from "@/features/auth/create-account";
import type {
  AuthMode,
  SignInFormValues,
  SignUpFormValues,
} from "@/features/auth/form.schema";
import { authClient } from "@/lib/auth-client";

export async function authenticate(
  values: SignInFormValues | SignUpFormValues,
  mode: AuthMode
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (mode === "signin") {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      return { message: error.message ?? "Unable to sign in.", ok: false };
    }

    return { ok: true };
  }

  const signUpValues = values as SignUpFormValues;
  const result = await createAccount({
    avatar: signUpValues.avatar,
    email: signUpValues.email,
    name: signUpValues.name,
    password: signUpValues.password,
  });

  if (!result.ok) {
    return { message: result.message, ok: false };
  }

  return { ok: true };
}
