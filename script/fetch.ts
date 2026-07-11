import { resolve } from "node:path";
import confirm from "@inquirer/confirm";
import chalk from "chalk";

const repoRoot = resolve(import.meta.dirname, "..");
const protectedBranches = new Set(["main", "master"]);

const runGit = (args: string[]): { exitCode: number; stdout: string } => {
  const result = Bun.spawnSync(["git", ...args], {
    cwd: repoRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString().trim(),
  };
};

const runGitOrThrow = (args: string[]): string => {
  const { exitCode, stdout } = runGit(args);

  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed`);
  }

  return stdout;
};

const resolveBaseBranch = (): string => {
  if (runGit(["rev-parse", "--verify", "origin/main"]).exitCode === 0) {
    return "main";
  }

  if (runGit(["rev-parse", "--verify", "main"]).exitCode === 0) {
    return "main";
  }

  if (runGit(["rev-parse", "--verify", "origin/master"]).exitCode === 0) {
    return "master";
  }

  if (runGit(["rev-parse", "--verify", "master"]).exitCode === 0) {
    return "master";
  }

  throw new Error("Could not find main or master branch");
};

const getCurrentBranch = (): string | null => {
  const { exitCode, stdout } = runGit([
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD",
  ]);

  if (exitCode !== 0) {
    return null;
  }

  return stdout;
};

const listLocalBranches = (): string[] => {
  const output = runGitOrThrow(["branch", "--format=%(refname:short)"]);
  return output.split("\n").filter(Boolean);
};

const listMergedBranches = (base: string): Set<string> => {
  const output = runGitOrThrow([
    "branch",
    "--merged",
    base,
    "--format=%(refname:short)",
  ]);
  return new Set(output.split("\n").filter(Boolean));
};

const deleteBranch = (branch: string, force: boolean): boolean => {
  const flag = force ? "-D" : "-d";
  const { exitCode } = runGit(["branch", flag, branch]);
  return exitCode === 0;
};

interface BranchInfo {
  branch: string;
  isCurrent: boolean;
  isMerged: boolean;
}

const classifyBranches = (
  branches: string[],
  base: string,
  currentBranch: string | null
): BranchInfo[] => {
  const merged = listMergedBranches(base);

  return branches
    .filter((branch) => !protectedBranches.has(branch))
    .map((branch) => ({
      branch,
      isCurrent: branch === currentBranch,
      isMerged: merged.has(branch),
    }));
};

const printBranchReport = (branches: BranchInfo[], base: string): void => {
  const merged = branches.filter((entry) => entry.isMerged && !entry.isCurrent);
  const unmerged = branches.filter(
    (entry) => !(entry.isMerged || entry.isCurrent)
  );
  const current = branches.find((entry) => entry.isCurrent);

  console.log(chalk.dim(`  base branch: ${base}`));
  console.log("");

  if (merged.length > 0) {
    console.log(chalk.green(`  merged (${merged.length})`));
    for (const entry of merged) {
      console.log(chalk.green(`    - ${entry.branch}`));
    }
    console.log("");
  }

  if (unmerged.length > 0) {
    console.log(chalk.yellow(`  not merged (${unmerged.length})`));
    for (const entry of unmerged) {
      console.log(chalk.yellow(`    - ${entry.branch}`));
    }
    console.log("");
  }

  if (current) {
    console.log(chalk.cyan(`  current branch (kept): ${current.branch}`));
    console.log("");
  }

  if (merged.length === 0 && unmerged.length === 0) {
    console.log(chalk.dim("  no local branches to clean up"));
  }
};

const pruneAndFetch = (): void => {
  console.log(chalk.bold("Fetching from remote..."));
  runGitOrThrow(["fetch", "--prune"]);
  console.log(chalk.green("  ✓ remote branches pruned"));
  console.log("");
};

const deleteBranches = (
  branches: string[],
  force: boolean
): { deleted: string[]; failed: string[] } => {
  const deleted: string[] = [];
  const failed: string[] = [];

  for (const branch of branches) {
    if (deleteBranch(branch, force)) {
      deleted.push(branch);
      console.log(chalk.green(`  ✓ deleted ${branch}`));
    } else {
      failed.push(branch);
      console.log(chalk.red(`  ✗ failed to delete ${branch}`));
    }
  }

  return { deleted, failed };
};

const promptDeleteMerged = async (branches: string[]): Promise<void> => {
  const shouldDeleteMerged = await confirm({
    default: false,
    message: chalk.yellow(
      `Delete ${branches.length} merged branch${branches.length === 1 ? "" : "es"}?`
    ),
  });

  if (!shouldDeleteMerged) {
    console.log(chalk.dim("\n  skipped merged branch cleanup"));
    return;
  }

  console.log("");
  console.log(chalk.bold("Deleting merged branches..."));
  const { failed } = deleteBranches(branches, false);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

const promptDeleteUnmerged = async (
  branches: string[],
  base: string
): Promise<void> => {
  console.log("");
  console.log(
    chalk.yellow(
      `  ${branches.length} branch${branches.length === 1 ? "" : "es"} not merged into ${base}`
    )
  );

  const shouldForceDelete = await confirm({
    default: false,
    message: chalk.red(
      `Force-delete unmerged branch${branches.length === 1 ? "" : "es"}?`
    ),
  });

  if (!shouldForceDelete) {
    console.log(chalk.dim("  kept unmerged branches"));
    return;
  }

  console.log("");
  console.log(chalk.bold("Force-deleting unmerged branches..."));
  const { failed } = deleteBranches(branches, true);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

export async function syncBranches(): Promise<void> {
  pruneAndFetch();

  const base = resolveBaseBranch();
  const currentBranch = getCurrentBranch();
  const branches = classifyBranches(listLocalBranches(), base, currentBranch);

  console.log(chalk.bold("Local branches"));
  console.log(chalk.dim("  ─".repeat(28)));
  printBranchReport(branches, base);

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
    await promptDeleteMerged(mergedToDelete);
  }

  if (unmergedCandidates.length > 0) {
    await promptDeleteUnmerged(unmergedCandidates, base);
  }

  console.log("");
  console.log(chalk.green("  ✓ branch sync complete"));
}

if (import.meta.main) {
  await syncBranches();
}
