import { log } from "evlog";

import { type InitLoggingOptions, initLogging } from "./logging";

export type InitScriptLoggingOptions = InitLoggingOptions & {
  /** Script name annotated on subsequent log calls. */
  script?: string;
};

/**
 * Bootstrap logging for monorepo / package CLI scripts.
 * Does not require `@vyrel/env` (safe when DATABASE_* etc. are unset).
 */
export function initScriptLogging(
  options: InitScriptLoggingOptions = {}
): void {
  const { script, ...rest } = options;

  initLogging({
    service: rest.service ?? "vyrel-scripts",
    pretty: rest.pretty ?? true,
    ...rest,
  });

  if (script !== undefined) {
    log.debug({ script, event: "script.start" });
  }
}

export { createLogger, log } from "evlog";
