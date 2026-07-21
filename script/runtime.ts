import { BunContext } from "@effect/platform-bun";
import { initScriptLogging } from "@vyrel/logging/script";
import { type Effect, ManagedRuntime } from "effect";

/**
 * Shared Bun platform runtime (FileSystem / Path / Command) for repo scripts.
 * Using a ManagedRuntime keeps `Effect.provide` off the call sites so scripts
 * stay free of language-service ignore directives.
 */
export const scriptRuntime = ManagedRuntime.make(BunContext.layer);

/**
 * Initialize evlog for a CLI script, then run an Effect program.
 */
export function runScript<A, E>(
  name: string,
  program: Effect.Effect<A, E, never>
): Promise<A> {
  initScriptLogging({ script: name, service: "vyrel-scripts" });
  return scriptRuntime.runPromise(program);
}
