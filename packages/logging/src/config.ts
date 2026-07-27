import { Config, Effect, Option } from "effect";
import {
  defineEvlog,
  type EvlogConfig,
  type LogLevel,
  toLoggerConfig,
} from "evlog";

/** Env `LOG_LEVEL` values used by `@vyrel/env` (includes LogTape-era aliases). */
export type VyrelEnvLogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "fatal";

export type InitLoggingOptions = {
  /** Override service name. Default: `SERVICE_NAME` env or `"vyrel"`. */
  service?: string;
  /** Override environment. Default: `NODE_ENV` or `"development"`. */
  environment?: string;
  /** Override minimum log level. Default: mapped from `LOG_LEVEL` env. */
  minLevel?: LogLevel;
  /** Force pretty output. Default: true when environment is development. */
  pretty?: boolean;
  /** PII redaction. Default: true in production. */
  redact?: boolean;
  /** Extra fields merged into the evlog config. */
  config?: Partial<EvlogConfig>;
};

const EVLOG_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);

/**
 * Map vyrel / LogTape-style levels onto evlog's four levels.
 */
export function mapLogLevel(
  value: string | undefined,
  fallback: LogLevel = "info"
): LogLevel {
  if (value === undefined) {
    return fallback;
  }

  if (EVLOG_LEVELS.has(value as LogLevel)) {
    return value as LogLevel;
  }

  switch (value) {
    case "trace":
      return "debug";
    case "warning":
      return "warn";
    case "fatal":
      return "error";
    default:
      return fallback;
  }
}

const environmentConfig = Config.string("NODE_ENV").pipe(
  Config.orElse(() => Config.string("VERCEL_ENV")),
  Config.withDefault("development")
);

const serviceNameConfig = Config.string("SERVICE_NAME").pipe(
  Config.withDefault("vyrel")
);

const logLevelConfig = Config.option(Config.string("LOG_LEVEL")).pipe(
  Config.map(Option.getOrUndefined)
);

function resolveEnvironment(override?: string): string {
  if (override !== undefined) {
    return override;
  }

  return Effect.runSync(environmentConfig);
}

/**
 * Build a shared evlog config for apps, scripts, and workers.
 */
export function defineVyrelLogging(
  options: InitLoggingOptions = {}
): EvlogConfig {
  const environment = resolveEnvironment(options.environment);
  const isProd = environment === "production";
  const defaultMinLevel = isProd ? "info" : "debug";

  const { logLevel, serviceName } = Effect.runSync(
    Effect.all({
      logLevel: logLevelConfig,
      serviceName: serviceNameConfig,
    })
  );

  return defineEvlog({
    service: options.service ?? serviceName,
    environment,
    minLevel: options.minLevel ?? mapLogLevel(logLevel, defaultMinLevel),
    pretty: options.pretty ?? !isProd,
    redact: options.redact ?? isProd,
    ...options.config,
  });
}

export function toVyrelLoggerConfig(options: InitLoggingOptions = {}) {
  return toLoggerConfig(defineVyrelLogging(options));
}
