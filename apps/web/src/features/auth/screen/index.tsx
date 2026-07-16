"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
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
  type AuthFormValues,
  type AuthMode,
  authFormSchema,
  parseAuthMode,
  signInDefaultValues,
  signUpDefaultValues,
} from "@/features/auth/form.schema";
import { resolvePostAuthRedirect } from "@/features/auth/resolve-post-auth-redirect";
import { authClient } from "@/lib/auth-client";

const AUTH_FORM_ID = "auth-form";

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
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            onSuccess={onAuthSuccess}
          />
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
  disabled,
  mode,
  onModeChange,
}: {
  disabled: boolean;
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
        disabled={disabled}
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
        disabled={disabled}
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

export function AuthForm({
  mode,
  onModeChange,
  onSuccess,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: () => Promise<void>;
}) {
  const form = useForm<AuthFormValues>({
    defaultValues:
      mode === "signin" ? signInDefaultValues : signUpDefaultValues,
    resolver: zodResolver(authFormSchema),
    shouldUnregister: true,
  });
  const pending = form.formState.isSubmitting;
  const isSignUp = mode === "signup";
  const submitLabel = isSignUp ? "Create account" : "Sign in";

  useEffect(() => {
    if (form.getValues("mode") === mode) {
      return;
    }

    const { email, password } = form.getValues();
    form.reset(
      mode === "signin"
        ? { ...signInDefaultValues, email, password }
        : { ...signUpDefaultValues, email, password }
    );
  }, [form, mode]);

  const changeMode = useCallback(
    (nextMode: AuthMode) => {
      if (nextMode === mode) {
        return;
      }

      const { email, password } = form.getValues();
      form.reset(
        nextMode === "signin"
          ? { ...signInDefaultValues, email, password }
          : { ...signUpDefaultValues, email, password }
      );
      onModeChange(nextMode);
    },
    [form, mode, onModeChange]
  );

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    if (values.mode === "signin") {
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
    } else {
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
    }

    try {
      await onSuccess();
    } catch (err) {
      const fallbackMessage =
        values.mode === "signin"
          ? "Unable to sign in."
          : "Unable to create account.";
      form.setError("root", {
        message: err instanceof Error ? err.message : fallbackMessage,
      });
    }
  });

  const nameError = form.getFieldState("name", form.formState).error;
  const emailError = form.formState.errors.email;
  const passwordError = form.formState.errors.password;
  const confirmPasswordError = form.getFieldState(
    "confirmPassword",
    form.formState
  ).error;

  return (
    <FormProvider {...form}>
      <AuthModeSwitch
        disabled={pending}
        mode={mode}
        onModeChange={changeMode}
      />

      <form
        className="flex flex-col gap-4"
        id={AUTH_FORM_ID}
        onSubmit={onSubmit}
      >
        <input type="hidden" {...form.register("mode")} />

        <FieldGroup>
          {isSignUp ? (
            <>
              <SignUpAvatarField formId={AUTH_FORM_ID} />

              <Field data-invalid={nameError !== undefined}>
                <FieldLabel htmlFor={`${AUTH_FORM_ID}-name`}>Name</FieldLabel>
                <Input
                  aria-invalid={nameError !== undefined}
                  autoComplete="name"
                  id={`${AUTH_FORM_ID}-name`}
                  placeholder="John Doe"
                  type="text"
                  {...form.register("name")}
                />
                {nameError ? <FieldError errors={[nameError]} /> : null}
              </Field>
            </>
          ) : null}

          <Field data-invalid={emailError !== undefined}>
            <FieldLabel htmlFor={`${AUTH_FORM_ID}-email`}>Email</FieldLabel>
            <Input
              aria-invalid={emailError !== undefined}
              autoComplete="email"
              id={`${AUTH_FORM_ID}-email`}
              placeholder="you@example.com"
              type="email"
              {...form.register("email")}
            />
            {emailError ? <FieldError errors={[emailError]} /> : null}
          </Field>

          <Field data-invalid={passwordError !== undefined}>
            <FieldLabel htmlFor={`${AUTH_FORM_ID}-password`}>
              Password
            </FieldLabel>
            <Input
              aria-invalid={passwordError !== undefined}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              id={`${AUTH_FORM_ID}-password`}
              placeholder={isSignUp ? "Create a password" : "Your password"}
              type="password"
              {...form.register("password")}
            />
            {passwordError ? <FieldError errors={[passwordError]} /> : null}
          </Field>

          {isSignUp ? (
            <Field data-invalid={confirmPasswordError !== undefined}>
              <FieldLabel htmlFor={`${AUTH_FORM_ID}-confirm-password`}>
                Confirm password
              </FieldLabel>
              <Input
                aria-invalid={confirmPasswordError !== undefined}
                autoComplete="new-password"
                id={`${AUTH_FORM_ID}-confirm-password`}
                placeholder="Repeat your password"
                type="password"
                {...form.register("confirmPassword")}
              />
              {confirmPasswordError ? (
                <FieldError errors={[confirmPasswordError]} />
              ) : null}
            </Field>
          ) : null}
        </FieldGroup>

        <FormRootError message={form.formState.errors.root?.message} />

        <Button disabled={pending} form={AUTH_FORM_ID} size="lg" type="submit">
          {pending ? (
            <Spinner className="size-4" />
          ) : (
            <span>{submitLabel}</span>
          )}
        </Button>
      </form>
    </FormProvider>
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
