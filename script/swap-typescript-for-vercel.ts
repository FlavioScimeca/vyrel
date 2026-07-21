import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { scriptRuntime } from "./runtime";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const root = path.resolve(path.join(import.meta.dirname, ".."));
  const typescriptPath = path.join(root, "node_modules/typescript");
  const typescript6Path = path.join(root, "node_modules/typescript6");

  if (!(yield* fs.exists(typescript6Path))) {
    yield* Effect.log(
      "swap-typescript-for-vercel: typescript6 is not installed, skipping"
    );
    return 0;
  }

  if (yield* fs.exists(typescriptPath)) {
    yield* fs.remove(typescriptPath, { force: true, recursive: true });
  }

  yield* fs.symlink(typescript6Path, typescriptPath);
  yield* Effect.log(
    "swap-typescript-for-vercel: symlinked typescript6 -> typescript for Vercel builders"
  );
  return 0;
});

if (import.meta.main) {
  process.exit(await scriptRuntime.runPromise(program));
}
