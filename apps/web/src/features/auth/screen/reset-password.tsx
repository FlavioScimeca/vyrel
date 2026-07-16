"use client";

import { IconCheck, IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";
import {
  type ChangeEvent,
  type SubmitEvent,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AuthResetPasswordShowcasePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const reset = useCallback(() => {
    setSent(false);
    setEmail("");
  }, []);

  const onEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  }, []);

  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!email.trim() || pending) {
        return;
      }
      setPending(true);
      window.setTimeout(() => {
        setPending(false);
        setSent(true);
      }, 700);
    },
    [email, pending]
  );

  const onResend = useCallback(() => {
    if (!email.trim() || pending) {
      return;
    }
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
    }, 700);
  }, [email, pending]);

  const toggleDemoState = useCallback(() => {
    if (sent) {
      reset();
      return;
    }
    setSent(true);
  }, [reset, sent]);

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        {sent ? (
          <SentState
            email={email}
            onResend={onResend}
            onTryDifferent={reset}
            pending={pending}
          />
        ) : (
          <RequestState
            email={email}
            onEmailChange={onEmailChange}
            onSubmit={onSubmit}
            pending={pending}
          />
        )}
      </Card>

      <Button
        className="absolute right-4 bottom-4 cursor-pointer rounded font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em] opacity-40 transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none"
        onClick={toggleDemoState}
        type="button"
      >
        Demo: toggle state →
      </Button>
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
  email,
  onEmailChange,
  pending,
  onSubmit,
}: {
  email: string;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  pending: boolean;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
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
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field>
            <FieldLabel htmlFor="reset-email">Email</FieldLabel>
            <Input
              autoComplete="email"
              id="reset-email"
              onChange={onEmailChange}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </Field>

          <Button className="mt-1" disabled={pending} size="lg" type="submit">
            Send reset link
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          href="/auth"
        >
          <IconChevronLeft className="size-3.5" />
          Back to sign in
        </Link>
      </CardFooter>
    </>
  );
}

function SentState({
  email,
  onTryDifferent,
  onResend,
  pending,
}: {
  email: string;
  onTryDifferent: () => void;
  onResend: () => void;
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
          We sent a reset link to{" "}
          <strong className="break-all text-foreground">{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-center text-muted-foreground text-xs">
          The link expires in 30 minutes. Didn't get it? Check your spam folder.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            disabled={pending}
            onClick={onResend}
            size="lg"
            type="button"
            variant="outline"
          >
            Resend link
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
      <CardFooter className="justify-center">
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          href="/auth"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </>
  );
}
