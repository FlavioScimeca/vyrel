import { createEvlog, type NextEvlogOptions } from "evlog/next";
import { defineNodeInstrumentation } from "evlog/next/instrumentation";

import { defineVyrelLogging, type InitLoggingOptions } from "./config";
import { initLogging } from "./logging";

/**
 * Create a Next.js-oriented evlog instance using shared vyrel defaults.
 */
export function createVyrelNextLogging(options: InitLoggingOptions = {}) {
  initLogging(options);

  const config = defineVyrelLogging(options);
  const nextOptions: NextEvlogOptions = {
    service: config.service,
    pretty: config.pretty,
    minLevel: config.minLevel,
    redact: config.redact,
    silent: config.silent,
    stringify: config.stringify,
    sampling: config.sampling,
    drain: config.drain,
    enrich: config.enrich,
    keep: config.keep,
    plugins: config.plugins,
    include: config.include,
    exclude: config.exclude,
    routes: config.routes,
    ...(config.environment === undefined
      ? {}
      : { env: { environment: config.environment } }),
  };

  return createEvlog(nextOptions);
}

/**
 * Next.js `instrumentation.ts` hooks with vyrel defaults.
 */
export function createVyrelNextInstrumentation(
  options: InitLoggingOptions = {}
) {
  const config = defineVyrelLogging(options);

  return defineNodeInstrumentation({
    service: config.service,
    pretty: config.pretty,
    minLevel: config.minLevel,
    silent: config.silent,
    stringify: config.stringify,
    sampling: config.sampling,
    drain: config.drain,
    ...(config.environment === undefined
      ? {}
      : { env: { environment: config.environment } }),
  });
}

export {
  createError,
  createEvlog,
  createEvlogError,
  evlogMiddleware,
  log,
  useLogger,
} from "evlog/next";
export type { NextEvlogOptions };
