import { useReducedMotion } from "framer-motion";
import type { Route } from "next";
import type { AuthMode } from "@/features/auth/form.schema";

export const LINK_CLASS =
  "text-muted-foreground text-sm hover:text-foreground hover:underline";

const SHELL_EASE = [0.22, 1, 0.36, 1] as const;

export type MotionTransition = {
  duration: number;
  ease?: typeof SHELL_EASE;
};

export function buildAuthModeHref(
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

export function useAuthMotion() {
  const prefersReducedMotion = useReducedMotion();

  const shellTransition: MotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: SHELL_EASE };
  const fadeTransition: MotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: SHELL_EASE };
  const fieldTransition: MotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: SHELL_EASE };

  return {
    fadeTransition,
    fieldTransition,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    shellTransition,
  };
}
