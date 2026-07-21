import {
  type AuditableLogger,
  createLogger,
  type EvlogConfig,
  initLogger,
  isEnabled,
  isLevelEnabled,
  type LogLevel,
  log,
} from "evlog";

import {
  defineVyrelLogging,
  type InitLoggingOptions,
  mapLogLevel,
  toVyrelLoggerConfig,
  type VyrelEnvLogLevel,
} from "./config";

let initialized = false;

/**
 * Initialize the global evlog logger once. Safe to call repeatedly.
 */
export function initLogging(options: InitLoggingOptions = {}): void {
  if (initialized) {
    return;
  }

  initLogger(toVyrelLoggerConfig(options));
  initialized = true;
}

/** Whether {@link initLogging} (or {@link initScriptLogging}) has run. */
export function isLoggingInitialized(): boolean {
  return initialized;
}

/** Reset init guard — intended for tests only. */
export function resetLoggingForTests(): void {
  initialized = false;
}

export type {
  AuditableLogger,
  EvlogConfig,
  InitLoggingOptions,
  LogLevel,
  VyrelEnvLogLevel,
};
export {
  createLogger,
  defineVyrelLogging,
  isEnabled,
  isLevelEnabled,
  log,
  mapLogLevel,
  toVyrelLoggerConfig,
};
