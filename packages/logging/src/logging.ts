import {
  configure,
  getConsoleSink,
  getLogger,
  type Logger,
  type LogLevel,
} from "@logtape/logtape";
import { getPrettyFormatter } from "@logtape/pretty";
import { env } from "@vyrel/env/server";
import { Effect } from "effect";

const LOG_LEVELS = [
  "trace",
  "debug",
  "info",
  "warning",
  "error",
  "fatal",
] as const satisfies readonly LogLevel[];

const ROOT_CATEGORY = "vyrel" as const;

function resolveLogLevel(value: string | undefined): LogLevel {
  if (value !== undefined && LOG_LEVELS.includes(value as LogLevel)) {
    return value as LogLevel;
  }

  return env.NODE_ENV === "production" ? "info" : "debug";
}

let configured = false;

export const configureLogging = Effect.gen(function* () {
  if (configured) {
    return;
  }

  const lowestLevel = resolveLogLevel(env.LOG_LEVEL);
  const isDev = env.NODE_ENV === "development";

  yield* Effect.promise(() =>
    configure({
      loggers: [
        {
          category: ["logtape", "meta"],
          lowestLevel: "warning",
          sinks: ["console"],
        },
        {
          category: [ROOT_CATEGORY],
          lowestLevel,
          sinks: ["console"],
        },
      ],
      reset: true,
      sinks: {
        console: getConsoleSink({
          formatter: isDev ? getPrettyFormatter() : undefined,
        }),
      },
    })
  );

  configured = true;
});

export function getAppLogger(...category: string[]): Logger {
  return getLogger([ROOT_CATEGORY, ...category]);
}
