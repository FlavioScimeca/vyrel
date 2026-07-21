import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Structured warning for morph schema helpers.
 * Uses `@vyrel/logging` when available (monorepo / apps that depend on it);
 * otherwise falls back to `console.warn` so published consumers stay intact.
 */
export function morphWarn(
  message: string,
  fields?: Record<string, unknown>
): void {
  try {
    // Lazy require keeps `@vyrel/logging` optional for published npm consumers.
    const logging =
      require("@vyrel/logging") as typeof import("@vyrel/logging");

    if (!logging.isLoggingInitialized()) {
      logging.initLogging({ service: "vyrel-morph", pretty: true });
    }

    logging.log.warn({
      message,
      module: "morph",
      ...fields,
    });
  } catch {
    if (fields === undefined) {
      console.warn(message);
      return;
    }
    console.warn(message, fields);
  }
}
