"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { VyrelLogo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  AuthPageBackdrop,
  AuthVisualPanel,
} from "@/features/auth/components/auth-visual-panel";
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
import { cn } from "@/lib/utils";

const AUTH_FORM_ID = "auth-form";
const LINK_CLASS =
  "text-muted-foreground text-sm hover:text-foreground hover:underline";

function buildAuthModeHref(
  mode: AuthMode,
  searchParams: URLSearchParams
): Route {
  const params = new URLSearchParams(searchParams.toString());

  if (mode === "signup") {
    params.set("mode", "signup");
  } else {
    params.delete("mode");
  }

  const query = params.toString();
  return (query.length > 0 ? `/auth?${query}` : "/auth") as Route;
}

export function AuthScreen() {
  const searchParams = useSearchParams();
  const mode = parseAuthMode(searchParams.get("mode"));
  const isSignUp = mode === "signup";
  const signInHref = buildAuthModeHref("signin", searchParams);
  const signUpHref = buildAuthModeHref("signup", searchParams);

  const onAuthSuccess = useCallback(async () => {
    const destination = await resolvePostAuthRedirect(searchParams.get("next"));
    window.location.assign(destination);
  }, [searchParams]);

  return (
    <div className="relative min-h-svh bg-background text-foreground">
      <AuthPageBackdrop />
      <div className="relative mx-auto flex min-h-svh max-w-[1440px] items-stretch p-4 md:p-10 lg:p-16">
        <div
          className={cn(
            "relative grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-foreground/10",
            isSignUp
              ? "lg:grid-cols-[1fr_minmax(440px,560px)]"
              : "lg:grid-cols-[minmax(440px,560px)_1fr]"
          )}
        >
          <div
            className={cn(
              "relative flex min-h-[680px] flex-col overflow-y-auto bg-card text-foreground",
              isSignUp ? "lg:order-2" : "lg:order-1"
            )}
          >
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10 lg:py-14">
              <div className="flex items-center justify-center">
                <VyrelLogo className="size-10" />
              </div>

              <div className="mt-12 flex flex-col gap-1.5">
                <h1 className="font-heading font-semibold text-2xl tracking-tight">
                  {isSignUp ? "Create an account" : "Welcome back"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {isSignUp
                    ? "Enter your details to get started."
                    : "Sign in to continue to Vyrel."}
                </p>
              </div>

              <div className="mt-6">
                <AuthForm mode={mode} onSuccess={onAuthSuccess} />
              </div>

              <div className="mt-5 flex items-baseline justify-between gap-4 text-sm">
                {isSignUp ? (
                  <Link
                    className={LINK_CLASS}
                    href={signInHref}
                    replace
                    scroll={false}
                  >
                    Log in to an existing account
                  </Link>
                ) : (
                  <>
                    <Link
                      className={LINK_CLASS}
                      href={signUpHref}
                      replace
                      scroll={false}
                    >
                      Register a new account
                    </Link>
                    <Link
                      className={LINK_CLASS}
                      href={"/auth/reset-password" as Route}
                    >
                      Forgot password?
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <AuthVisualPanel className={isSignUp ? "lg:order-1" : "lg:order-2"} />
        </div>
      </div>
    </div>
  );
}

export function AuthForm({
  mode,
  onSuccess,
}: {
  mode: AuthMode;
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
