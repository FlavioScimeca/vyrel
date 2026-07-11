import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Data, Effect } from "effect";

class StageChangesetError extends Data.TaggedError("StageChangesetError")<{
  readonly relativePath: string;
}> {}

class AmendChangesetError extends Data.TaggedError("AmendChangesetError")<{
  readonly message: string;
}> {}

const runGit = (cwd: string, args: string[]) =>
  Effect.sync(() => {
    const result = Bun.spawnSync(["git", ...args], {
      cwd,
      stderr: "pipe",
      stdout: "pipe",
    });

    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString().trim(),
    };
  });

const writeLog = (message: string) =>
  Effect.sync(() => {
    process.stderr.write(`${message}\n`);
  });

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const repoRoot = path.resolve(import.meta.dirname, "..");
  const markerPath = path.join(repoRoot, ".git", "vyrel-pending-changeset");

  if (!(yield* fs.exists(markerPath))) {
    return;
  }

  const relativePath = (yield* fs.readFileString(markerPath)).trim();

  if (relativePath.length === 0) {
    yield* fs.remove(markerPath).pipe(Effect.ignore);
    return;
  }

  const headFiles = yield* runGit(repoRoot, [
    "diff-tree",
    "--no-commit-id",
    "--name-only",
    "-r",
    "HEAD",
  ]);

  if (
    headFiles.exitCode === 0 &&
    headFiles.stdout.split("\n").includes(relativePath)
  ) {
    yield* fs.remove(markerPath).pipe(Effect.ignore);
    return;
  }

  const stage = yield* runGit(repoRoot, ["add", relativePath]);

  if (stage.exitCode !== 0) {
    return yield* new StageChangesetError({ relativePath });
  }

  const amend = yield* runGit(repoRoot, [
    "commit",
    "--amend",
    "--no-edit",
    "--no-verify",
  ]);

  if (amend.exitCode !== 0) {
    return yield* new AmendChangesetError({
      message: "Failed to amend commit with pending changeset",
    });
  }

  yield* fs.remove(markerPath).pipe(Effect.ignore);
  yield* writeLog(`Amended commit to include ${relativePath}`);
});

// @effect-diagnostics-next-line effect/strictEffectProvide:off
BunRuntime.runMain(program.pipe(Effect.provide(BunContext.layer)));
