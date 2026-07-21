"use client";

import { AnimatePresence, LazyMotion, m } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { VyrelLogo } from "@/components/logo";
import {
  AuthPageBackdrop,
  AuthVisualPanel,
} from "@/features/auth/components/auth-visual-panel";
import type { AuthMode } from "@/features/auth/form.schema";
import { resolvePostAuthRedirect } from "@/features/auth/resolve-post-auth-redirect";
import { AuthForm } from "@/features/auth/screen/auth-form";
import {
  buildAuthModeHref,
  LINK_CLASS,
  useAuthMotion,
} from "@/features/auth/screen/auth-shared";
import { loadMotionDomAnimation } from "@/lib/motion-features";
import { cn } from "@/lib/utils";

type AuthScreenProps = {
  mode: AuthMode;
  safeNext: string | null;
};

export function AuthScreen({ mode, safeNext }: AuthScreenProps) {
  const isSignUp = mode === "signup";
  const signInHref = buildAuthModeHref("signin", safeNext);
  const signUpHref = buildAuthModeHref("signup", safeNext);
  const { fadeTransition, prefersReducedMotion, shellTransition } =
    useAuthMotion();

  const onAuthSuccess = async () => {
    const destination = await resolvePostAuthRedirect(safeNext);
    window.location.assign(destination);
  };

  return (
    <LazyMotion features={loadMotionDomAnimation} strict>
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
            <m.div
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
                    <m.div
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
                    </m.div>
                  </AnimatePresence>
                </div>

                <div className="mt-6">
                  <AuthForm mode={mode} onSuccessAction={onAuthSuccess} />
                </div>

                <div className="mt-5">
                  <AnimatePresence initial={false} mode="wait">
                    <m.div
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
                    </m.div>
                  </AnimatePresence>
                </div>
              </div>
            </m.div>

            <m.div
              className={cn(
                "relative hidden min-h-[680px] overflow-hidden lg:block",
                isSignUp ? "lg:order-1" : "lg:order-2"
              )}
              layout={!prefersReducedMotion}
              transition={shellTransition}
            >
              <AuthVisualPanel className="h-full" />
            </m.div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}
