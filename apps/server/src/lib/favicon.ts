import { FileSystem, Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(BunContext.layer);

/**
 * FileSystem.exists is async, so this Effect cannot use runSync.
 * Resolve once at module load via runPromise (top-level await).
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

  return yield* Effect.die(
    new Error(
      `favicon.ico not found. Tried:\n${candidates.map((c) => `  - ${c}`).join("\n")}`
    )
  );
});

export const faviconPath = await runtime.runPromise(resolveFaviconPath);
