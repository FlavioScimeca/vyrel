import { Path } from "@effect/platform";
import { Effect } from "effect";
import { scriptRuntime } from "./runtime";

const alreadyPublishedPattern =
  /cannot publish over the previously published versions/i;

const run = (
  cwd: string,
  args: string[]
): Effect.Effect<{ exitCode: number; output: string }> =>
  Effect.sync(() => {
    const result = Bun.spawnSync(args, {
      cwd,
      stderr: "pipe",
      stdout: "pipe",
    });

    return {
      exitCode: result.exitCode,
      output: `${result.stdout.toString()}${result.stderr.toString()}`,
    };
  });

const buildVerified = (repoRoot: string): Effect.Effect<number> =>
  Effect.gen(function* () {
    const { exitCode, output } = yield* run(repoRoot, [
      "bun",
      "x",
      "turbo",
      "run",
      "build:verified",
      "--filter=./packages/public/*",
    ]);

    if (exitCode !== 0) {
      yield* Effect.logError(output);
      return exitCode;
    }

    return 0;
  });

const publishPackages = (repoRoot: string): Effect.Effect<number> =>
  Effect.gen(function* () {
    const { exitCode, output } = yield* run(repoRoot, [
      "bunx",
      "changeset",
      "publish",
    ]);

    if (exitCode === 0) {
      return 0;
    }

    if (alreadyPublishedPattern.test(output)) {
      yield* Effect.log("Packages already published on npm — skipping.");
      return 0;
    }

    yield* Effect.logError(output);
    return exitCode;
  });

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const repoRoot = path.resolve(import.meta.dirname, "..");

  const buildExit = yield* buildVerified(repoRoot);
  if (buildExit !== 0) {
    return buildExit;
  }

  return yield* publishPackages(repoRoot);
});

if (import.meta.main) {
  process.exit(await scriptRuntime.runPromise(program));
}
