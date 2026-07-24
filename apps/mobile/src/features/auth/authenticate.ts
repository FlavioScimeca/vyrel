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
): Promise<
  | { ok: true; requiresVerification?: boolean }
  | { ok: false; message: string; requiresVerification?: boolean }
> {
  if (mode === "signin") {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const requiresVerification = error.code === "EMAIL_NOT_VERIFIED";
      return {
        message: requiresVerification
          ? "Verify your email before signing in."
          : (error.message ?? "Unable to sign in."),
        ok: false,
        requiresVerification,
      };
    }

    return { ok: true };
  }

  const signUpValues = values as SignUpFormValues;
  const result = await createAccount({
    callbackURL: "vyrel-mobile://verified",
    email: signUpValues.email,
    name: signUpValues.name,
    password: signUpValues.password,
  });

  if (!result.ok) {
    return { message: result.message, ok: false };
  }

  return { ok: true, requiresVerification: true };
}
