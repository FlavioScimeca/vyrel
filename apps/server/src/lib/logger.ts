import { Config, Effect } from "effect";
import { createLogger } from "evlog";

const { env, logLevel } = Effect.runSync(
  Effect.all({
    env: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
    logLevel: Config.string("LOG_LEVEL").pipe(Config.withDefault("info")),
  })
);

export const logger = createLogger({
  env,
  level: logLevel,
});

export function logEvent<T extends Record<string, unknown>>(
  event: string,
  payload?: T
): void {
  logger.info(event, payload);
}
