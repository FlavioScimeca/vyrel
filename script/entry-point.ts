import { type FileSystem, Path } from "@effect/platform";
import confirm from "@inquirer/confirm";
import select from "@inquirer/select";
import chalk from "chalk";
import { Console, Effect } from "effect";
import { checkEffectProjects } from "./check-effect-ts";
import { checkNodeModules, printNodeModulesReport } from "./check-nm";
import {
  cleanupRepo,
  collectCleanupTargets,
  printCleanupReport,
} from "./clean-up";
import { scriptRuntime } from "./runtime";

type ScriptAction = "check" | "check-effect" | "cleanup" | "exit";

interface MenuOption {
  description: string;
  label: string;
  value: ScriptAction;
}

const MENU_OPTIONS: MenuOption[] = [
  {
    description: "Scan for nested node_modules and print a health report",
    label: "Check node_modules",
    value: "check",
  },
  {
    description: "Run @effect/language-service diagnostics on Effect projects",
    label: "Check Effect diagnostics",
    value: "check-effect",
  },
  {
    description: "Remove nested dist, .turbo, and node_modules folders",
    label: "Clean up artifacts",
    value: "cleanup",
  },
  {
    description: "Close the script menu",
    label: "Exit",
    value: "exit",
  },
];

const resolveRepoRoot = Effect.gen(function* () {
  const path = yield* Path.Path;
  return path.resolve(import.meta.dirname, "..");
});

const printBanner = (repoRoot: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Console.clear;
    yield* Effect.log("");
    yield* Effect.log(chalk.bold.cyan("  vyrel scripts"));
    yield* Effect.log(chalk.dim("  ─".repeat(28)));
    yield* Effect.log(chalk.dim(`  ${repoRoot}`));
    yield* Effect.log("");
  });

const printDivider = Effect.log(chalk.dim("  ─".repeat(60)));

const runCheck = (
  repoRoot: string
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    yield* Effect.log("");
    yield* Effect.log(chalk.bold("Running node_modules check..."));
    yield* printDivider;

    const report = yield* checkNodeModules(repoRoot);
    yield* printNodeModulesReport(report);

    if (report.isHealthy) {
      yield* Effect.log(chalk.green("  ✓ workspace looks healthy"));
    } else {
      yield* Effect.log(chalk.yellow("  ! nested node_modules detected"));
    }
  });

const runEffectCheck = (repoRoot: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log("");
    yield* Effect.log(chalk.bold("Running Effect language service check..."));
    yield* printDivider;

    const report = yield* Effect.promise(() => checkEffectProjects(repoRoot));
    const failed = report.results.find(
      (result) => !result.skipped && result.exitCode !== 0
    );

    if (failed !== undefined) {
      yield* Effect.log(chalk.red("  ✗ Effect diagnostics failed"));
      return;
    }

    yield* Effect.log("");
    yield* Effect.log(chalk.green("  ✓ Effect language service checks passed"));
  });

const runCleanup = (
  repoRoot: string
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const { skippedCacheOnly, targets } =
      yield* collectCleanupTargets(repoRoot);

    yield* Effect.log("");
    yield* Effect.log(chalk.bold("Cleanup preview"));
    yield* printDivider;

    if (targets.length === 0) {
      yield* Effect.log(chalk.dim("  nothing to clean"));
      return;
    }

    const distCount = targets.filter((target) => target.kind === "dist").length;
    const turboCount = targets.filter(
      (target) => target.kind === ".turbo"
    ).length;
    const nodeModulesCount = targets.filter(
      (target) => target.kind === "node_modules"
    ).length;

    yield* Effect.log(chalk.white(`  ${targets.length} paths ready to delete`));
    yield* Effect.log(
      chalk.dim(
        `  dist: ${distCount}  ·  .turbo: ${turboCount}  ·  node_modules: ${nodeModulesCount}`
      )
    );

    if (skippedCacheOnly.length > 0) {
      yield* Effect.log(
        chalk.dim(
          `  ${skippedCacheOnly.length} cache-only node_modules will be kept`
        )
      );
    }

    yield* Effect.log("");
    for (const target of targets) {
      yield* Effect.log(chalk.red(`  - ${target.relativePath}`));
    }

    const shouldCleanup = yield* Effect.promise(() =>
      confirm({
        default: false,
        message: chalk.yellow("Delete these paths?"),
      })
    );

    if (!shouldCleanup) {
      yield* Effect.log(chalk.dim("\n  cleanup cancelled"));
      return;
    }

    yield* Effect.log("");
    yield* Effect.log(chalk.bold("Cleaning up..."));
    yield* printDivider;

    const report = yield* cleanupRepo(repoRoot);
    yield* printCleanupReport(report);

    if (report.errors.length > 0) {
      yield* Effect.log(chalk.red("  cleanup finished with errors"));
    } else if (report.deleted.length > 0) {
      yield* Effect.log(
        chalk.green(`  ✓ removed ${report.deleted.length} paths`)
      );
    }
  });

const promptAction = Effect.promise(() =>
  select<ScriptAction>({
    choices: MENU_OPTIONS.map((option) => ({
      description: chalk.dim(option.description),
      name: option.label,
      value: option.value,
    })),
    message: chalk.bold("What would you like to run?"),
    pageSize: 8,
  })
);

const promptContinue = Effect.promise(() =>
  confirm({
    default: true,
    message: chalk.dim("Run another command?"),
  })
);

const runScriptMenuStep = (
  repoRoot: string
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    yield* printBanner(repoRoot);

    const action = yield* promptAction;

    switch (action) {
      case "check":
        yield* runCheck(repoRoot);
        break;
      case "check-effect":
        yield* runEffectCheck(repoRoot);
        break;
      case "cleanup":
        yield* runCleanup(repoRoot);
        break;
      case "exit":
        yield* Effect.log("");
        yield* Effect.log(chalk.dim("  bye"));
        yield* Effect.log("");
        return;
      default:
        break;
    }

    yield* Effect.log("");
    const shouldContinue = yield* promptContinue;

    if (!shouldContinue) {
      yield* Effect.log("");
      yield* Effect.log(chalk.dim("  bye"));
      yield* Effect.log("");
      return;
    }

    yield* runScriptMenuStep(repoRoot);
  });

export const runScriptMenu = (
  repoRoot?: string
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const root = repoRoot ?? (yield* resolveRepoRoot);
    yield* runScriptMenuStep(root);
  });

if (import.meta.main) {
  await scriptRuntime.runPromise(runScriptMenu());
}
