import { resolve } from "node:path";
import confirm from "@inquirer/confirm";
import select from "@inquirer/select";
import chalk from "chalk";
import { checkEffectProjects } from "./check-effect-ts";
import { checkNodeModules, printNodeModulesReport } from "./check-nm";
import {
  cleanupRepo,
  collectCleanupTargets,
  printCleanupReport,
} from "./clean-up";

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

function resolveRepoRoot(): string {
  return resolve(import.meta.dirname, "..");
}

function printBanner(repoRoot: string): void {
  console.clear();
  console.log("");
  console.log(chalk.bold.cyan("  vyrel scripts"));
  console.log(chalk.dim("  ─".repeat(28)));
  console.log(chalk.dim(`  ${repoRoot}`));
  console.log("");
}

function printDivider(): void {
  console.log(chalk.dim("  ─".repeat(60)));
}

function runCheck(repoRoot: string): void {
  console.log("");
  console.log(chalk.bold("Running node_modules check..."));
  printDivider();

  const report = checkNodeModules(repoRoot);
  printNodeModulesReport(report);

  if (report.isHealthy) {
    console.log(chalk.green("  ✓ workspace looks healthy"));
  } else {
    console.log(chalk.yellow("  ! nested node_modules detected"));
  }
}

async function runEffectCheck(repoRoot: string): Promise<void> {
  console.log("");
  console.log(chalk.bold("Running Effect language service check..."));
  printDivider();

  const report = await checkEffectProjects(repoRoot);
  const failed = report.results.find(
    (result) => !result.skipped && result.exitCode !== 0
  );

  if (failed) {
    console.log(chalk.red("  ✗ Effect diagnostics failed"));
    return;
  }

  console.log("");
  console.log(chalk.green("  ✓ Effect language service checks passed"));
}

async function runCleanup(repoRoot: string): Promise<void> {
  const { skippedCacheOnly, targets } = collectCleanupTargets(repoRoot);

  console.log("");
  console.log(chalk.bold("Cleanup preview"));
  printDivider();

  if (targets.length === 0) {
    console.log(chalk.dim("  nothing to clean"));
    return;
  }

  const distCount = targets.filter((target) => target.kind === "dist").length;
  const turboCount = targets.filter(
    (target) => target.kind === ".turbo"
  ).length;
  const nodeModulesCount = targets.filter(
    (target) => target.kind === "node_modules"
  ).length;

  console.log(chalk.white(`  ${targets.length} paths ready to delete`));
  console.log(
    chalk.dim(
      `  dist: ${distCount}  ·  .turbo: ${turboCount}  ·  node_modules: ${nodeModulesCount}`
    )
  );

  if (skippedCacheOnly.length > 0) {
    console.log(
      chalk.dim(
        `  ${skippedCacheOnly.length} cache-only node_modules will be kept`
      )
    );
  }

  console.log("");
  for (const target of targets) {
    console.log(chalk.red(`  - ${target.relativePath}`));
  }

  const shouldCleanup = await confirm({
    default: false,
    message: chalk.yellow("Delete these paths?"),
  });

  if (!shouldCleanup) {
    console.log(chalk.dim("\n  cleanup cancelled"));
    return;
  }

  console.log("");
  console.log(chalk.bold("Cleaning up..."));
  printDivider();

  const report = cleanupRepo(repoRoot);
  printCleanupReport(report);

  if (report.errors.length > 0) {
    console.log(chalk.red("  cleanup finished with errors"));
  } else if (report.deleted.length > 0) {
    console.log(chalk.green(`  ✓ removed ${report.deleted.length} paths`));
  }
}

function promptAction(): Promise<ScriptAction> {
  return select<ScriptAction>({
    choices: MENU_OPTIONS.map((option) => ({
      description: chalk.dim(option.description),
      name: option.label,
      value: option.value,
    })),
    message: chalk.bold("What would you like to run?"),
    pageSize: 8,
  });
}

function promptContinue(): Promise<boolean> {
  return confirm({
    default: true,
    message: chalk.dim("Run another command?"),
  });
}

async function runScriptMenuStep(repoRoot: string): Promise<void> {
  printBanner(repoRoot);

  const action = await promptAction();

  switch (action) {
    case "check":
      runCheck(repoRoot);
      break;
    case "check-effect":
      await runEffectCheck(repoRoot);
      break;
    case "cleanup":
      await runCleanup(repoRoot);
      break;
    case "exit":
      console.log("");
      console.log(chalk.dim("  bye"));
      console.log("");
      return;
    default:
      break;
  }

  console.log("");
  const shouldContinue = await promptContinue();

  if (!shouldContinue) {
    console.log("");
    console.log(chalk.dim("  bye"));
    console.log("");
    return;
  }

  await runScriptMenuStep(repoRoot);
}

export function runScriptMenu(repoRoot = resolveRepoRoot()): Promise<void> {
  return runScriptMenuStep(repoRoot);
}

if (import.meta.main) {
  await runScriptMenu();
}
