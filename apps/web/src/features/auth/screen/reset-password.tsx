"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronLeft,
} from "@tabler/icons-react";
import Link from "next/link";
import { type FormEventHandler, type ReactNode, useState } from "react";
import {
  type FieldError as HookFormFieldError,
  type UseFormRegister,
  type UseFormRegisterReturn,
  useForm,
  useFormState,
} from "react-hook-form";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  type ResetPasswordRequestValues,
  type ResetPasswordValues,
  resetPasswordDefaultValues,
  resetPasswordRequestDefaultValues,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from "@/features/auth/form.schema";
import { redirectAfterPasswordReset } from "@/features/auth/redirect-after-password-reset";
import { authClient } from "@/lib/auth-client";

const REQUEST_FORM_ID = "reset-password-request";
const PASSWORD_FORM_ID = "reset-password";

type AuthResetPasswordPageProps = {
  invalidToken: boolean;
  token: string | null;
};

export function AuthResetPasswordPage({
  invalidToken,
  token,
}: AuthResetPasswordPageProps) {
  if (invalidToken) {
    return (
      <ResetPasswordShell>
        <InvalidTokenState />
      </ResetPasswordShell>
    );
  }

  if (token !== null) {
    return (
      <ResetPasswordShell>
        <NewPasswordState token={token} />
      </ResetPasswordShell>
    );
  }

  return <RequestPasswordReset />;
}

function RequestPasswordReset() {
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const form = useForm<ResetPasswordRequestValues>({
    defaultValues: resetPasswordRequestDefaultValues,
    resolver: zodResolver(resetPasswordRequestSchema),
  });
  const formState = useFormState({ control: form.control });

  const requestReset = async (email: string) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error !== null) {
      throw new Error(error.message ?? "Unable to send the reset link.");
    }
  };

  const onSubmit = form.handleSubmit(async ({ email }) => {
    form.clearErrors("root");
    try {
      await requestReset(email);
      setSentEmail(email);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Unable to send the reset link.",
      });
    }
  });

  const onResend = async () => {
    if (sentEmail === null || resending) {
      return;
    }

    setResending(true);
    setResendError(null);
    try {
      await requestReset(sentEmail);
    } catch (error) {
      setResendError(
        error instanceof Error ? error.message : "Unable to resend the link."
      );
    } finally {
      setResending(false);
    }
  };

  const onTryDifferent = () => {
    setSentEmail(null);
    setResendError(null);
    form.reset(resetPasswordRequestDefaultValues);
  };

  if (sentEmail !== null) {
    return (
      <ResetPasswordShell>
        <SentState
          email={sentEmail}
          error={resendError}
          onResend={onResend}
          onTryDifferent={onTryDifferent}
          pending={resending}
        />
      </ResetPasswordShell>
    );
  }

  return (
    <ResetPasswordShell>
      <RequestState
        emailError={formState.errors.email}
        onSubmit={onSubmit}
        pending={formState.isSubmitting}
        register={form.register}
        rootError={formState.errors.root?.message}
      />
    </ResetPasswordShell>
  );
}

function ResetPasswordShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex size-8 items-center justify-center rounded-md bg-foreground">
        <span className="block size-2 rounded-full bg-background" />
      </div>
    </div>
  );
}

function RequestState({
  emailError,
  onSubmit,
  pending,
  register,
  rootError,
}: {
  emailError?: HookFormFieldError;
  onSubmit: FormEventHandler<HTMLFormElement>;
  pending: boolean;
  register: UseFormRegister<ResetPasswordRequestValues>;
  rootError?: string;
}) {
  return (
    <>
      <CardHeader className="items-center text-center">
        <BrandMark />
        <CardTitle className="mt-4 font-heading text-2xl tracking-tight">
          Reset your password
        </CardTitle>
        <CardDescription className="text-sm">
          Enter your email and we'll send you a link to reset it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          id={REQUEST_FORM_ID}
          onSubmit={onSubmit}
        >
          <Field data-invalid={emailError !== undefined}>
            <FieldLabel htmlFor={`${REQUEST_FORM_ID}-email`}>Email</FieldLabel>
            <Input
              aria-invalid={emailError !== undefined}
              autoComplete="email"
              id={`${REQUEST_FORM_ID}-email`}
              placeholder="you@example.com"
              type="email"
              {...register("email")}
            />
            {emailError ? <FieldError errors={[emailError]} /> : null}
          </Field>
          <FormError message={rootError} />
          <Button disabled={pending} size="lg" type="submit">
            {pending ? <Spinner className="size-4" /> : "Send reset link"}
          </Button>
        </form>
      </CardContent>
      <BackToSignIn />
    </>
  );
}

function SentState({
  email,
  error,
  onTryDifferent,
  onResend,
  pending,
}: {
  email: string;
  error: string | null;
  onTryDifferent: () => void;
  onResend: () => Promise<void>;
  pending: boolean;
}) {
  return (
    <>
      <CardHeader className="items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15">
          <IconCheck className="size-6 text-emerald-600" />
        </div>
        <CardTitle className="mt-4 font-heading text-2xl tracking-tight">
          Check your inbox
        </CardTitle>
        <CardDescription className="wrap-break-word text-sm">
          If an account exists for{" "}
          <strong className="break-all text-foreground">{email}</strong>, we've
          sent it a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-center text-muted-foreground text-xs">
          The link expires in 60 minutes. Didn't get it? Check your spam folder.
        </p>
        <FormError message={error ?? undefined} />
        <div className="flex flex-col gap-2">
          <Button
            disabled={pending}
            onClick={onResend}
            size="lg"
            type="button"
            variant="outline"
          >
            {pending ? <Spinner className="size-4" /> : "Resend link"}
          </Button>
          <Button
            onClick={onTryDifferent}
            size="lg"
            type="button"
            variant="ghost"
          >
            Try a different email
          </Button>
        </div>
      </CardContent>
      <BackToSignIn />
    </>
  );
}

function NewPasswordState({ token }: { token: string }) {
  const form = useForm<ResetPasswordValues>({
    defaultValues: resetPasswordDefaultValues,
    resolver: zodResolver(resetPasswordSchema),
  });
  const formState = useFormState({ control: form.control });
  const onSubmit = form.handleSubmit(async ({ password }) => {
    form.clearErrors("root");
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (error !== null) {
      form.setError("root", {
        message: error.message ?? "Unable to reset your password.",
      });
      return;
    }

    redirectAfterPasswordReset();
  });

  return (
    <>
      <CardHeader className="items-center text-center">
        <BrandMark />
        <CardTitle className="mt-4 font-heading text-2xl tracking-tight">
          Choose a new password
        </CardTitle>
        <CardDescription className="text-sm">
          Use at least 8 characters for your new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          id={PASSWORD_FORM_ID}
          onSubmit={onSubmit}
        >
          <PasswordField
            error={formState.errors.password}
            id={`${PASSWORD_FORM_ID}-password`}
            label="New password"
            registration={form.register("password")}
          />
          <PasswordField
            error={formState.errors.confirmPassword}
            id={`${PASSWORD_FORM_ID}-confirm-password`}
            label="Confirm password"
            registration={form.register("confirmPassword")}
          />
          <FormError message={formState.errors.root?.message} />
          <Button disabled={formState.isSubmitting} size="lg" type="submit">
            {formState.isSubmitting ? (
              <Spinner className="size-4" />
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      </CardContent>
      <BackToSignIn />
    </>
  );
}

function PasswordField({
  error,
  id,
  label,
  registration,
}: {
  error?: HookFormFieldError;
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        aria-invalid={error !== undefined}
        autoComplete="new-password"
        id={id}
        type="password"
        {...registration}
      />
      {error ? <FieldError errors={[error]} /> : null}
    </Field>
  );
}

function InvalidTokenState() {
  return (
    <>
      <CardHeader className="items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/15">
          <IconAlertTriangle className="size-6 text-destructive" />
        </div>
        <CardTitle className="mt-4 font-heading text-2xl tracking-tight">
          Reset link expired
        </CardTitle>
        <CardDescription className="text-sm">
          This password reset link is invalid or has expired.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          render={<Link href="/auth/reset-password" />}
        >
          Request a new link
        </Button>
      </CardContent>
      <BackToSignIn />
    </>
  );
}

function FormError({ message }: { message?: string }) {
  if (message === undefined || message.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function BackToSignIn() {
  return (
    <CardFooter className="justify-center">
      <Link
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
        href="/auth"
      >
        <IconChevronLeft className="size-3.5" />
        Back to sign in
      </Link>
    </CardFooter>
  );
}
