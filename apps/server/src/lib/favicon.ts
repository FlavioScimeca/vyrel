import { FileSystem, Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(BunContext.layer);

const resolveFaviconPath = (): string =>
  runtime.runSync(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = import.meta.dirname;
      const candidates = [
        path.join(dir, "public/favicon.ico"),
        path.join(dir, "../public/favicon.ico"),
        path.join(dir, "../../public/favicon.ico"),
      ];

      for (const candidate of candidates) {
        if (yield* fs.exists(candidate)) {
          return candidate;
        }
      }

      return yield* Effect.die(new Error("favicon.ico not found"));
    })
  );

export const faviconPath = resolveFaviconPath();
