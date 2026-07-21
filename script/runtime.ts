import { BunContext } from "@effect/platform-bun";
import { ManagedRuntime } from "effect";

/**
 * Shared Bun platform runtime (FileSystem / Path / Command) for repo scripts.
 * Using a ManagedRuntime keeps `Effect.provide` off the call sites so scripts
 * stay free of language-service ignore directives.
 */
export const scriptRuntime = ManagedRuntime.make(BunContext.layer);
