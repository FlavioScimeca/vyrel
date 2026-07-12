import confirm from "@inquirer/confirm";
import select from "@inquirer/select";
import chalk from "chalk";
import {
  type Bump,
  changedPublicPackages,
  listStagedFiles,
  loadPublicPackageNames,
  needsChangesetDecision,
  repoRoot,
  writeIntent,
} from "./changeset-utils";

const bumpChoices: Array<{ name: string; value: Bump }> = [
  { name: "patch — bug fixes, internal tweaks", value: "patch" },
  { name: "minor — new backward-compatible features", value: "minor" },
  { name: "major — breaking changes", value: "major" },
];

const promptChangesetIntent = async (
  changedPackages: string[]
): Promise<void> => {
  console.log("");
  console.log(chalk.bold("Changeset"));
  console.log(chalk.dim("  Public package changes detected:"));
  for (const packageName of changedPackages) {
    console.log(chalk.cyan(`    - ${packageName}`));
  }
  console.log("");

  const shouldCreate = await confirm({
    default: true,
    message: "Create a changeset for the next release?",
  });

  if (!shouldCreate) {
    await writeIntent({ action: "skip" });
    console.log(chalk.dim("  Skipping changeset for this commit"));
    console.log(
      chalk.dim(
        "  Tip: add the skip-changeset label on the PR if CI asks for one"
      )
    );
    console.log("");
    return;
  }

  const bump = await select<Bump>({
    choices: bumpChoices,
    default: "patch",
    message: "Select the semver bump:",
    pageSize: 5,
  });

  await writeIntent({
    action: "create",
    bump,
    packages: changedPackages,
  });

  console.log(
    chalk.dim(
      `  Will create a ${bump} changeset after you finish the commit message`
    )
  );
  console.log("");
};

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

export async function runCommit(): Promise<number> {
  const stagedFiles = listStagedFiles();
  const publicPackages = loadPublicPackageNames();
  const changedPackages = changedPublicPackages(stagedFiles, publicPackages);

  if (needsChangesetDecision(stagedFiles, changedPackages)) {
    await promptChangesetIntent(changedPackages);
  }

  return runCzg();
}

if (import.meta.main) {
  process.exit(await runCommit());
}
