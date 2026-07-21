import { FileSystem, Path } from "@effect/platform";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import { Effect } from "effect";
import { scriptRuntime } from "./runtime";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const root = path.resolve(path.join(import.meta.dirname, ".."));
  const typescriptPath = path.join(root, "node_modules/typescript");
  const typescript6Path = path.join(root, "node_modules/typescript6");

  if (!(yield* fs.exists(typescript6Path))) {
    log.info(
      "swap-typescript-for-vercel",
      "swap-typescript-for-vercel: typescript6 is not installed, skipping"
    );
    return 0;
  }

  // Next.js still requires classic typescript/lib/typescript.js (TS 5/6 API).
  // TypeScript 7 does not ship it, so point `typescript` at typescript6 for builds.
  if (yield* fs.exists(typescriptPath)) {
    const existing = yield* fs
      .readLink(typescriptPath)
      .pipe(Effect.catchAll(() => Effect.succeed(null)));

    if (existing === typescript6Path) {
      log.info(
        "swap-typescript-for-vercel",
        "swap-typescript-for-vercel: typescript already points at typescript6"
      );
      return 0;
    }

    yield* fs.remove(typescriptPath, { force: true, recursive: true });
  }

  yield* fs.symlink(typescript6Path, typescriptPath);
  log.info(
    "swap-typescript-for-vercel",
    "swap-typescript-for-vercel: symlinked typescript6 -> typescript for Next.js builders"
  );
  return 0;
});

if (import.meta.main) {
  initScriptLogging({ script: "swap-typescript-for-vercel" });
  process.exit(await scriptRuntime.runPromise(program));
}
