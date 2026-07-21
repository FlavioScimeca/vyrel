import { FileSystem, Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(BunContext.layer);

/**
 * Resolve favicon on demand (not at import time).
 * FileSystem.exists is async — must use runPromise, never runSync.
 * Keeping this off the module-init path means a missing favicon cannot
 * block or crash `export default` (and avoids top-level await, which
 * has triggered TDZ races in Vercel's Bun loader).
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

  return yield* Effect.fail(
    new Error(
      `favicon.ico not found. Tried:\n${candidates.map((c) => `  - ${c}`).join("\n")}`
    )
  );
});

const cachedResolve = Effect.cached(resolveFaviconPath);

export const getFaviconPath = (): Promise<string> =>
  runtime.runPromise(
    Effect.gen(function* () {
      const getPath = yield* cachedResolve;
      return yield* getPath;
    })
  );
