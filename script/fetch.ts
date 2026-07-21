import { Path } from "@effect/platform";
import confirm from "@inquirer/confirm";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import chalk from "chalk";
import { Effect } from "effect";
import { scriptRuntime } from "./runtime";

const protectedBranches = new Set(["main", "master"]);

const runGit = (
  repoRoot: string,
  args: string[]
): Effect.Effect<{ exitCode: number; stdout: string }> =>
  Effect.sync(() => {
    const result = Bun.spawnSync(["git", ...args], {
      cwd: repoRoot,
      stderr: "pipe",
      stdout: "pipe",
    });

    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString().trim(),
    };
  });

const runGitOrThrow = (
  repoRoot: string,
  args: string[]
): Effect.Effect<string> =>
  Effect.gen(function* () {
    const { exitCode, stdout } = yield* runGit(repoRoot, args);

    if (exitCode !== 0) {
      return yield* Effect.die(new Error(`git ${args.join(" ")} failed`));
    }

    return stdout;
  });

const resolveBaseBranch = (repoRoot: string): Effect.Effect<string> =>
  Effect.gen(function* () {
    if (
      (yield* runGit(repoRoot, ["rev-parse", "--verify", "origin/main"]))
        .exitCode === 0
    ) {
      return "main";
    }

    if (
      (yield* runGit(repoRoot, ["rev-parse", "--verify", "main"])).exitCode ===
      0
    ) {
      return "main";
    }

    if (
      (yield* runGit(repoRoot, ["rev-parse", "--verify", "origin/master"]))
        .exitCode === 0
    ) {
      return "master";
    }

    if (
      (yield* runGit(repoRoot, ["rev-parse", "--verify", "master"]))
        .exitCode === 0
    ) {
      return "master";
    }

    return yield* Effect.die(new Error("Could not find main or master branch"));
  });

const getCurrentBranch = (repoRoot: string): Effect.Effect<string | null> =>
  Effect.gen(function* () {
    const { exitCode, stdout } = yield* runGit(repoRoot, [
      "symbolic-ref",
      "--quiet",
      "--short",
      "HEAD",
    ]);

    if (exitCode !== 0) {
      return null;
    }

    return stdout;
  });

const listLocalBranches = (repoRoot: string): Effect.Effect<string[]> =>
  Effect.gen(function* () {
    const output = yield* runGitOrThrow(repoRoot, [
      "branch",
      "--format=%(refname:short)",
    ]);
    return output.split("\n").filter(Boolean);
  });

const listMergedBranches = (
  repoRoot: string,
  base: string
): Effect.Effect<Set<string>> =>
  Effect.gen(function* () {
    const output = yield* runGitOrThrow(repoRoot, [
      "branch",
      "--merged",
      base,
      "--format=%(refname:short)",
    ]);
    return new Set(output.split("\n").filter(Boolean));
  });

const deleteBranch = (
  repoRoot: string,
  branch: string,
  force: boolean
): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const flag = force ? "-D" : "-d";
    const { exitCode } = yield* runGit(repoRoot, ["branch", flag, branch]);
    return exitCode === 0;
  });

interface BranchInfo {
  branch: string;
  isCurrent: boolean;
  isMerged: boolean;
}

const classifyBranches = (
  repoRoot: string,
  branches: string[],
  base: string,
  currentBranch: string | null
): Effect.Effect<BranchInfo[]> =>
  Effect.gen(function* () {
    const merged = yield* listMergedBranches(repoRoot, base);

    return branches
      .filter((branch) => !protectedBranches.has(branch))
      .map((branch) => ({
        branch,
        isCurrent: branch === currentBranch,
        isMerged: merged.has(branch),
      }));
  });

const printBranchReport = (
  branches: BranchInfo[],
  base: string
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const merged = branches.filter(
      (entry) => entry.isMerged && !entry.isCurrent
    );
    const unmerged = branches.filter(
      (entry) => !(entry.isMerged || entry.isCurrent)
    );
    const current = branches.find((entry) => entry.isCurrent);

    log.info("fetch", chalk.dim(`  base branch: ${base}`));
    log.info("fetch", "");

    if (merged.length > 0) {
      log.info("fetch", chalk.green(`  merged (${merged.length})`));
      for (const entry of merged) {
        log.info("fetch", chalk.green(`    - ${entry.branch}`));
      }
      log.info("fetch", "");
    }

    if (unmerged.length > 0) {
      log.info("fetch", chalk.yellow(`  not merged (${unmerged.length})`));
      for (const entry of unmerged) {
        log.info("fetch", chalk.yellow(`    - ${entry.branch}`));
      }
      log.info("fetch", "");
    }

    if (current !== undefined) {
      log.info(
        "fetch",
        chalk.cyan(`  current branch (kept): ${current.branch}`)
      );
      log.info("fetch", "");
    }

    if (merged.length === 0 && unmerged.length === 0) {
      log.info("fetch", chalk.dim("  no local branches to clean up"));
    }
  });

const pruneAndFetch = (repoRoot: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    log.info("fetch", chalk.bold("Fetching from remote..."));
    yield* runGitOrThrow(repoRoot, ["fetch", "--prune"]);
    log.info("fetch", chalk.green("  ✓ remote branches pruned"));
    log.info("fetch", "");
  });

const deleteBranches = (
  repoRoot: string,
  branches: string[],
  force: boolean
): Effect.Effect<{ deleted: string[]; failed: string[] }> =>
  Effect.gen(function* () {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const branch of branches) {
      if (yield* deleteBranch(repoRoot, branch, force)) {
        deleted.push(branch);
        log.info("fetch", chalk.green(`  ✓ deleted ${branch}`));
      } else {
        failed.push(branch);
        log.info("fetch", chalk.red(`  ✗ failed to delete ${branch}`));
      }
    }

    return { deleted, failed };
  });

const promptDeleteMerged = (
  repoRoot: string,
  branches: string[]
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const shouldDeleteMerged = yield* Effect.promise(() =>
      confirm({
        default: false,
        message: chalk.yellow(
          `Delete ${branches.length} merged branch${branches.length === 1 ? "" : "es"}?`
        ),
      })
    );

    if (!shouldDeleteMerged) {
      log.info("fetch", chalk.dim("\n  skipped merged branch cleanup"));
      return;
    }

    log.info("fetch", "");
    log.info("fetch", chalk.bold("Deleting merged branches..."));
    const { failed } = yield* deleteBranches(repoRoot, branches, false);

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  });

const promptDeleteUnmerged = (
  repoRoot: string,
  branches: string[],
  base: string
): Effect.Effect<void> =>
  Effect.gen(function* () {
    log.info("fetch", "");
    log.info(
      "fetch",
      chalk.yellow(
        `  ${branches.length} branch${branches.length === 1 ? "" : "es"} not merged into ${base}`
      )
    );

    const shouldForceDelete = yield* Effect.promise(() =>
      confirm({
        default: false,
        message: chalk.red(
          `Force-delete unmerged branch${branches.length === 1 ? "" : "es"}?`
        ),
      })
    );

    if (!shouldForceDelete) {
      log.info("fetch", chalk.dim("  kept unmerged branches"));
      return;
    }

    log.info("fetch", "");
    log.info("fetch", chalk.bold("Force-deleting unmerged branches..."));
    const { failed } = yield* deleteBranches(repoRoot, branches, true);

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  });

export const syncBranches = (): Effect.Effect<void, never, Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const repoRoot = path.resolve(import.meta.dirname, "..");

    yield* pruneAndFetch(repoRoot);

    const base = yield* resolveBaseBranch(repoRoot);
    const currentBranch = yield* getCurrentBranch(repoRoot);
    const branches = yield* classifyBranches(
      repoRoot,
      yield* listLocalBranches(repoRoot),
      base,
      currentBranch
    );

    log.info("fetch", chalk.bold("Local branches"));
    log.info("fetch", chalk.dim("  ─".repeat(28)));
    yield* printBranchReport(branches, base);

    const mergedToDelete = branches
      .filter((entry) => entry.isMerged && !entry.isCurrent)
      .map((entry) => entry.branch);

    const unmergedCandidates = branches
      .filter((entry) => !(entry.isMerged || entry.isCurrent))
      .map((entry) => entry.branch);

    if (mergedToDelete.length === 0 && unmergedCandidates.length === 0) {
      return;
    }

    if (mergedToDelete.length > 0) {
      yield* promptDeleteMerged(repoRoot, mergedToDelete);
    }

    if (unmergedCandidates.length > 0) {
      yield* promptDeleteUnmerged(repoRoot, unmergedCandidates, base);
    }

    log.info("fetch", "");
    log.info("fetch", chalk.green("  ✓ branch sync complete"));
  });

if (import.meta.main) {
  initScriptLogging({ script: "fetch" });
  await scriptRuntime.runPromise(syncBranches());
}
