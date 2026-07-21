import { FileSystem, Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Data, Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(BunContext.layer);

class FaviconNotFoundError extends Data.TaggedError("FaviconNotFoundError")<{
  readonly candidates: readonly string[];
  readonly message: string;
}> {}

/**
 * Effect program to locate favicon.ico.
 * Uses FileSystem.exists (async) — must be run with runPromise, never runSync.
 *
 * Do NOT top-level-await this: that makes the whole ESM module async and
 * Vercel's Bun loader can read `export default` before evaluation finishes
 * → ReferenceError: Cannot access 'default' before initialization.
 *
 * Effect guidance: runPromise belongs at the framework boundary (route handler).
 */
const resolveFaviconPath = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = import.meta.dirname;
  const cwd = path.resolve(".");
  const candidates = [
    path.join(dir, "public/favicon.ico"),
    path.join(dir, "../public/favicon.ico"),
    path.join(dir, "../../public/favicon.ico"),
    path.join(cwd, "public/favicon.ico"),
    path.join(cwd, "dist/public/favicon.ico"),
    "/var/task/apps/server/dist/public/favicon.ico",
    "/var/task/public/favicon.ico",
  ];

  for (const candidate of candidates) {
    if (yield* fs.exists(candidate)) {
      return candidate;
    }
  }

  return yield* new FaviconNotFoundError({
    candidates,
    message: `favicon.ico not found. Tried:\n${candidates.map((c) => `  - ${c}`).join("\n")}`,
  });
});

/** Memoize so cold FS lookup runs once per isolate. */
const cachedResolve = Effect.cached(resolveFaviconPath);

/** Effect to resolve favicon path (memoized). Compose at the handler with Effect.gen. */
export const getFaviconPath = Effect.gen(function* () {
  const getPath = yield* cachedResolve;
  return yield* getPath;
});

/** Bridge for Elysia: run Effect at the framework boundary only. */
export const runFavicon = runtime.runPromise;
