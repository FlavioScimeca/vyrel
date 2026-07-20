import { FetchHttpClient } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Clock, Layer, ManagedRuntime } from "effect";

/**
 * Shared Bun platform services (FS/Path/Command), Clock, and Fetch HttpClient.
 */
const BunPortingLayer = Layer.mergeAll(
  BunContext.layer,
  FetchHttpClient.layer,
  Layer.sync(Clock.Clock, Clock.make)
);

export const bunPortingRuntime = ManagedRuntime.make(BunPortingLayer);
