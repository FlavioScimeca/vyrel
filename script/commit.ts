import confirm from "@inquirer/confirm";
import select from "@inquirer/select";
import chalk from "chalk";
import { Effect } from "effect";
import type { ParseError } from "effect/ParseResult";
import {
  type Bump,
  changedPublicPackages,
  getChangesetSkipReason,
  listStagedFiles,
  loadPublicPackageNames,
  needsChangesetDecision,
  repoRoot,
  writeIntent,
} from "./changeset-utils";
import { scriptRuntime } from "./runtime";

const bumpChoices: Array<{ name: string; value: Bump }> = [
  { name: "patch — bug fixes, internal tweaks", value: "patch" },
  { name: "minor — new backward-compatible features", value: "minor" },
  { name: "major — breaking changes", value: "major" },
];

const promptChangesetIntent = (
  changedPackages: string[]
): Effect.Effect<void, ParseError> =>
  Effect.gen(function* () {
    yield* Effect.log("");
    yield* Effect.log(chalk.bold("Changeset"));
    yield* Effect.log(chalk.dim("  Public package changes detected:"));
    for (const packageName of changedPackages) {
      yield* Effect.log(chalk.cyan(`    - ${packageName}`));
    }
    yield* Effect.log("");

    const shouldCreate = yield* Effect.promise(() =>
      confirm({
        default: true,
        message: "Create a changeset for the next release?",
      })
    );

    if (!shouldCreate) {
      yield* writeIntent({ action: "skip" });
      yield* Effect.log(chalk.dim("  Skipping changeset for this commit"));
      yield* Effect.log(
        chalk.dim(
          "  Tip: add the skip-changeset label on the PR if CI asks for one"
        )
      );
      yield* Effect.log("");
      return;
    }

    const bump = yield* Effect.promise(() =>
      select<Bump>({
        choices: bumpChoices,
        default: "patch",
        message: "Select the semver bump:",
        pageSize: 5,
      })
    );

    yield* writeIntent({
      action: "create",
      bump,
      packages: changedPackages,
    });

    yield* Effect.log(
      chalk.dim(
        `  Will create a ${bump} changeset after you finish the commit message`
      )
    );
    yield* Effect.log("");
  });

const runCzg = (): number => {
  const result = Bun.spawnSync(["bunx", "czg"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      VYREL_INTERACTIVE_COMMIT: "1",
    },
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  return result.exitCode;
};

export const runCommit = (): Effect.Effect<number, ParseError> =>
  Effect.gen(function* () {
    const stagedFiles = listStagedFiles();
    const publicPackages = loadPublicPackageNames();
    const changedPackages = changedPublicPackages(stagedFiles, publicPackages);

    if (needsChangesetDecision(stagedFiles, changedPackages)) {
      yield* promptChangesetIntent(changedPackages);
    } else {
      const skipReason = getChangesetSkipReason(stagedFiles, changedPackages);

      if (skipReason !== null) {
        yield* Effect.log("");
        yield* Effect.log(chalk.dim(`Changeset: ${skipReason}`));
        yield* Effect.log("");
      }
    }

    return runCzg();
  });

if (import.meta.main) {
  const exitCode = await scriptRuntime.runPromise(runCommit());
  process.exit(exitCode);
}
