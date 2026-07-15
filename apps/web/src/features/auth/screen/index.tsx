"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SignUpAvatarField } from "@/features/auth/components/sign-up-avatar-field";
import { createAccount } from "@/features/auth/create-account";
import {
  type AuthMode,
  parseAuthMode,
  type SignInFormValues,
  type SignUpFormValues,
  signInDefaultValues,
  signInFormSchema,
  signUpDefaultValues,
  signUpFormSchema,
} from "@/features/auth/form.schema";
import { resolvePostAuthRedirect } from "@/features/auth/resolve-post-auth-redirect";
import { authClient } from "@/lib/auth-client";

const SIGN_IN_FORM_ID = "auth-sign-in-form";
const SIGN_UP_FORM_ID = "auth-sign-up-form";

export function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseAuthMode(searchParams.get("mode"));

  const setMode = useCallback(
    (nextMode: AuthMode) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextMode === "signup") {
        params.set("mode", "signup");
      } else {
        params.delete("mode");
      }

      const query = params.toString();
      router.replace(query.length > 0 ? `/auth?${query}` : "/auth", {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const onAuthSuccess = useCallback(async () => {
    const destination = await resolvePostAuthRedirect(searchParams.get("next"));
    window.location.assign(destination);
  }, [searchParams]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to continue to Vyrel."
              : "Enter your details to get started."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <AuthModeSwitch mode={mode} onModeChange={setMode} />

          {mode === "signin" ? (
            <SignInForm formId={SIGN_IN_FORM_ID} onSuccess={onAuthSuccess} />
          ) : (
            <SignUpForm formId={SIGN_UP_FORM_ID} onSuccess={onAuthSuccess} />
          )}
        </CardContent>

        <CardFooter className="justify-center">
          {mode === "signin" ? (
            <Link
              className="text-muted-foreground text-sm hover:text-foreground"
              href={"/auth/reset-password" as Route}
            >
              Forgot your password?
            </Link>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}

function AuthModeSwitch({
  mode,
  onModeChange,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  const selectSignIn = useCallback(() => {
    onModeChange("signin");
  }, [onModeChange]);

  const selectSignUp = useCallback(() => {
    onModeChange("signup");
  }, [onModeChange]);

  return (
    <div
      className="grid grid-cols-2 rounded-none border border-border p-1"
      role="tablist"
    >
      <Button
        aria-selected={mode === "signin"}
        className="w-full"
        onClick={selectSignIn}
        role="tab"
        type="button"
        variant={mode === "signin" ? "secondary" : "ghost"}
      >
        Sign in
      </Button>
      <Button
        aria-selected={mode === "signup"}
        className="w-full"
        onClick={selectSignUp}
        role="tab"
        type="button"
        variant={mode === "signup" ? "secondary" : "ghost"}
      >
        Sign up
      </Button>
    </div>
  );
}

function SignInForm({
  formId,
  onSuccess,
}: {
  formId: string;
  onSuccess: () => Promise<void>;
}) {
  const form = useForm<SignInFormValues>({
    defaultValues: signInDefaultValues,
    resolver: zodResolver(signInFormSchema),
  });
  const pending = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      form.setError("root", {
        message: error.message ?? "Unable to sign in.",
      });
      return;
    }

    try {
      await onSuccess();
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Unable to sign in.",
      });
    }
  });

  const emailError = form.formState.errors.email;
  const passwordError = form.formState.errors.password;

  return (
    <form className="flex flex-col gap-4" id={formId} onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={emailError !== undefined}>
          <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
          <Input
            aria-invalid={emailError !== undefined}
            autoComplete="email"
            id={`${formId}-email`}
            placeholder="you@example.com"
            type="email"
            {...form.register("email")}
          />
          {emailError ? <FieldError errors={[emailError]} /> : null}
        </Field>

        <Field data-invalid={passwordError !== undefined}>
          <FieldLabel htmlFor={`${formId}-password`}>Password</FieldLabel>
          <Input
            aria-invalid={passwordError !== undefined}
            autoComplete="current-password"
            id={`${formId}-password`}
            placeholder="Your password"
            type="password"
            {...form.register("password")}
          />
          {passwordError ? <FieldError errors={[passwordError]} /> : null}
        </Field>
      </FieldGroup>

      <FormRootError message={form.formState.errors.root?.message} />

      <Button disabled={pending} form={formId} size="lg" type="submit">
        {pending ? <Spinner className="size-4" /> : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({
  formId,
  onSuccess,
}: {
  formId: string;
  onSuccess: () => Promise<void>;
}) {
  const form = useForm<SignUpFormValues>({
    defaultValues: signUpDefaultValues,
    resolver: zodResolver(signUpFormSchema),
  });

  const pending = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    const result = await createAccount({
      avatar: values.avatar,
      email: values.email,
      name: values.name,
      password: values.password,
    });

    if (!result.ok) {
      form.setError("root", {
        message: result.message,
      });
      return;
    }

    try {
      await onSuccess();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error ? err.message : "Unable to create account.",
      });
    }
  });

  const avatarError = form.formState.errors.avatar;
  const nameError = form.formState.errors.name;
  const emailError = form.formState.errors.email;
  const passwordError = form.formState.errors.password;
  const confirmPasswordError = form.formState.errors.confirmPassword;

  return (
    <form className="flex flex-col gap-4" id={formId} onSubmit={onSubmit}>
      <FieldGroup>
        <SignUpAvatarField
          clearErrors={form.clearErrors}
          control={form.control}
          error={avatarError}
          formId={formId}
          isSubmitting={pending}
          setError={form.setError}
        />

        <Field data-invalid={nameError !== undefined}>
          <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
          <Input
            aria-invalid={nameError !== undefined}
            autoComplete="name"
            id={`${formId}-name`}
            placeholder="John Doe"
            type="text"
            {...form.register("name")}
          />
          {nameError ? <FieldError errors={[nameError]} /> : null}
        </Field>

        <Field data-invalid={emailError !== undefined}>
          <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
          <Input
            aria-invalid={emailError !== undefined}
            autoComplete="email"
            id={`${formId}-email`}
            placeholder="you@example.com"
            type="email"
            {...form.register("email")}
          />
          {emailError ? <FieldError errors={[emailError]} /> : null}
        </Field>

        <Field data-invalid={passwordError !== undefined}>
          <FieldLabel htmlFor={`${formId}-password`}>Password</FieldLabel>
          <Input
            aria-invalid={passwordError !== undefined}
            autoComplete="new-password"
            id={`${formId}-password`}
            placeholder="Create a password"
            type="password"
            {...form.register("password")}
          />
          {passwordError ? <FieldError errors={[passwordError]} /> : null}
        </Field>

        <Field data-invalid={confirmPasswordError !== undefined}>
          <FieldLabel htmlFor={`${formId}-confirm-password`}>
            Confirm password
          </FieldLabel>
          <Input
            aria-invalid={confirmPasswordError !== undefined}
            autoComplete="new-password"
            id={`${formId}-confirm-password`}
            placeholder="Repeat your password"
            type="password"
            {...form.register("confirmPassword")}
          />
          {confirmPasswordError ? (
            <FieldError errors={[confirmPasswordError]} />
          ) : null}
        </Field>
      </FieldGroup>

      <FormRootError message={form.formState.errors.root?.message} />

      <Button disabled={pending} form={formId} size="lg" type="submit">
        {pending ? <Spinner className="size-4" /> : "Create account"}
      </Button>
    </form>
  );
}

function FormRootError({ message }: { message?: string }) {
  if (message === undefined || message.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
