import { evlog } from "evlog/elysia";

import { defineVyrelLogging, type InitLoggingOptions } from "./config";
import { initLogging } from "./logging";

/**
 * Elysia plugin with vyrel defaults. Ensures global logger init, then mounts
 * request-scoped wide-event logging (`{ log }` derive + `useLogger()`).
 */
export function createVyrelElysiaPlugin(options: InitLoggingOptions = {}) {
  initLogging(options);

  const config = defineVyrelLogging(options);

  return evlog({
    redact: config.redact,
    ...(config.drain === undefined ? {} : { drain: config.drain }),
    ...(config.enrich === undefined ? {} : { enrich: config.enrich }),
    ...(config.keep === undefined ? {} : { keep: config.keep }),
    ...(config.plugins === undefined ? {} : { plugins: config.plugins }),
  });
}

export { useLogger } from "evlog/elysia";
