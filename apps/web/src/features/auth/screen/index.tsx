"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import {
  type FieldErrors,
  FormProvider,
  type Resolver,
  useForm,
  useFormState,
} from "react-hook-form";
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
  type SignUpFormValues,
  signInDefaultValues,
  signUpDefaultValues,
} from "@/features/auth/form.schema";
import { resolvePostAuthRedirect } from "@/features/auth/resolve-post-auth-redirect";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const AUTH_FORM_ID = "auth-form";
const LINK_CLASS =
  "text-muted-foreground text-sm hover:text-foreground hover:underline";

const SHELL_EASE = [0.22, 1, 0.36, 1] as const;

type MotionTransition = {
  duration: number;
  ease?: typeof SHELL_EASE;
};

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
  const prefersReducedMotion = useReducedMotion();
  const shellTransition: MotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: SHELL_EASE };
  const fadeTransition: MotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: SHELL_EASE };

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
          <motion.div
            className={cn(
              "relative flex min-h-[680px] flex-col overflow-y-auto bg-card text-foreground",
              isSignUp ? "lg:order-2" : "lg:order-1"
            )}
            layout={!prefersReducedMotion}
            transition={shellTransition}
          >
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10 lg:py-14">
              <div className="flex items-center justify-center">
                <VyrelLogo className="size-10" />
              </div>

              <div className="mt-12">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1.5"
                    exit={
                      prefersReducedMotion ? undefined : { opacity: 0, y: -6 }
                    }
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 6 }
                    }
                    key={mode}
                    transition={fadeTransition}
                  >
                    <h1 className="font-heading font-semibold text-2xl tracking-tight">
                      {isSignUp ? "Create an account" : "Welcome back"}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      {isSignUp
                        ? "Enter your details to get started."
                        : "Sign in to continue to Vyrel."}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-6">
                <AuthForm mode={mode} onSuccessAction={onAuthSuccess} />
              </div>

              <div className="mt-5">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="flex items-baseline justify-between gap-4 text-sm"
                    exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    key={mode}
                    transition={fadeTransition}
                  >
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
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={cn(
              "relative hidden min-h-[680px] overflow-hidden lg:block",
              isSignUp ? "lg:order-1" : "lg:order-2"
            )}
            layout={!prefersReducedMotion}
            transition={shellTransition}
          >
            <AuthVisualPanel className="h-full" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function AuthForm({
  mode,
  onSuccessAction,
}: {
  mode: AuthMode;
  onSuccessAction: () => Promise<void>;
}) {
  const isSignUp = mode === "signup";
  const resolver = useMemo<Resolver<AuthFormValues>>(
    () => (values, context, options) =>
      zodResolver(authFormSchema)(
        { ...values, mode } as AuthFormValues,
        context,
        options
      ),
    [mode]
  );
  const form = useForm<AuthFormValues>({
    defaultValues:
      mode === "signin" ? signInDefaultValues : signUpDefaultValues,
    resolver,
    shouldUnregister: true,
  });
  const { errors, isSubmitting } = useFormState({ control: form.control });
  const pending = isSubmitting;
  const submitLabel = isSignUp ? "Create account" : "Sign in";
  const prefersReducedMotion = useReducedMotion();
  const fieldTransition: MotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: SHELL_EASE };

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
    const authValues = { ...values, mode } as AuthFormValues;
    const result = await authenticate(authValues);

    if (!result.ok) {
      form.setError("root", { message: result.message });
      return;
    }

    try {
      await onSuccessAction();
    } catch (err) {
      const fallbackMessage = isSignUp
        ? "Unable to create account."
        : "Unable to sign in.";
      form.setError("root", {
        message: err instanceof Error ? err.message : fallbackMessage,
      });
    }
  });

  const signUpErrors = isSignUp
    ? (errors as FieldErrors<SignUpFormValues>)
    : undefined;
  const nameError = signUpErrors?.name;
  const emailError = errors.email;
  const passwordError = errors.password;
  const confirmPasswordError = signUpErrors?.confirmPassword;

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4"
        id={AUTH_FORM_ID}
        onSubmit={onSubmit}
      >
        <FieldGroup>
          <AnimatedSignUpBlock
            prefersReducedMotion={Boolean(prefersReducedMotion)}
            show={isSignUp}
            transition={fieldTransition}
          >
            <div className="flex flex-col gap-4">
              <SignUpAvatarField formId={AUTH_FORM_ID} />
              <Field data-invalid={nameError !== undefined}>
                <FieldLabel htmlFor={`${AUTH_FORM_ID}-name`}>Name</FieldLabel>
                <Input
                  aria-invalid={nameError !== undefined}
                  aria-required={true}
                  autoComplete="name"
                  id={`${AUTH_FORM_ID}-name`}
                  placeholder="John Doe"
                  type="text"
                  {...form.register("name")}
                />
                {nameError ? <FieldError errors={[nameError]} /> : null}
              </Field>
            </div>
          </AnimatedSignUpBlock>

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

          <AnimatedSignUpBlock
            prefersReducedMotion={Boolean(prefersReducedMotion)}
            show={isSignUp}
            transition={fieldTransition}
          >
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
          </AnimatedSignUpBlock>
        </FieldGroup>

        <FormRootError message={errors.root?.message} />

        <Button disabled={pending} form={AUTH_FORM_ID} size="lg" type="submit">
          {pending ? (
            <Spinner className="size-4" />
          ) : (
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                key={submitLabel}
                transition={fieldTransition}
              >
                {submitLabel}
              </motion.span>
            </AnimatePresence>
          )}
        </Button>
      </form>
    </FormProvider>
  );
}

async function authenticate(
  values: AuthFormValues
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (values.mode === "signin") {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      return { message: error.message ?? "Unable to sign in.", ok: false };
    }

    return { ok: true };
  }

  const result = await createAccount({
    avatar: values.avatar,
    email: values.email,
    name: values.name,
    password: values.password,
  });

  if (!result.ok) {
    return { message: result.message, ok: false };
  }

  return { ok: true };
}

function AnimatedSignUpBlock({
  children,
  prefersReducedMotion,
  show,
  transition,
}: {
  children: ReactNode;
  prefersReducedMotion: boolean;
  show: boolean;
  transition: MotionTransition;
}) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
          exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
          initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
          key="signup-block"
          transition={transition}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
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
