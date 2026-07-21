import { createLogger, log } from "@vyrel/logging";
import { useLogger } from "@vyrel/logging/elysia";

/**
 * Prefer the Elysia request-scoped logger when inside a request; otherwise a
 * module-scoped wide-event logger for `@vyrel/api` background work.
 */
export function getApiLogger() {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: evlog request ALS accessor, not a React hook
    return useLogger();
  } catch {
    return createLogger({ module: "api" });
  }
}

/** Convenience for one-off structured logs outside a request. */
export const apiLog = log;
