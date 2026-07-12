import { join } from "node:path";
import { Glob } from "bun";

export type Bump = "major" | "minor" | "patch";

export type ChangesetIntent =
  | { action: "skip" }
  | {
      action: "create";
      bump: Bump;
      packages: string[];
    };

export const repoRoot = join(import.meta.dirname, "..");
export const publicPackagesRoot = join(repoRoot, "packages/public");
export const changesetDir = join(repoRoot, ".changeset");
export const intentPath = join(repoRoot, ".git/vyrel-changeset-intent.json");
export const pendingChangesetMarkerPath = join(
  repoRoot,
  ".git/vyrel-pending-changeset"
);

const publicTestFilePattern = /\.(test|spec)\.(ts|tsx)$/;
const packageJsonPathPattern = /\/package\.json$/;
const versionOnlyPublicFilePattern =
  /^packages\/public\/[^/]+\/(?:package\.json|CHANGELOG\.md)$/;

export const readTextFile = (path: string): string => {
  const result = Bun.spawnSync(["cat", path], {
    cwd: repoRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to read ${path}`);
  }

  return result.stdout.toString();
};

export const runGit = (args: string[]): string | null => {
  const result = Bun.spawnSync(["git", ...args], {
    cwd: repoRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  if (result.exitCode !== 0) {
    return null;
  }

  return result.stdout.toString().trim();
};

export const listStagedFiles = (): string[] => {
  const output = runGit([
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACMRT",
  ]);

  if (output === null) {
    return [];
  }

  return output.split("\n").filter(Boolean);
};

export const isPublishablePublicChange = (file: string): boolean => {
  if (!file.startsWith("packages/public/")) {
    return false;
  }

  return !publicTestFilePattern.test(file);
};

export const isChangesetFile = (file: string): boolean =>
  file.startsWith(".changeset/") &&
  file.endsWith(".md") &&
  !file.endsWith("README.md");

export const isVersionOnlyPublicChange = (files: string[]): boolean => {
  const publicChanges = files.filter(isPublishablePublicChange);

  if (publicChanges.length === 0) {
    return false;
  }

  return publicChanges.every((file) => versionOnlyPublicFilePattern.test(file));
};

export const isAutomationEnvironment = (): boolean =>
  Bun.env.CI === "true" || Bun.env.GITHUB_ACTIONS === "true";

export const isInteractiveTerminal = (): boolean =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY);

const resolveBaseBranch = (): string => {
  if (runGit(["rev-parse", "--verify", "origin/main"]) !== null) {
    return "origin/main";
  }

  if (runGit(["rev-parse", "--verify", "main"]) !== null) {
    return "main";
  }

  return "HEAD~1";
};

export const branchChangesetFiles = (): string[] => {
  const base = resolveBaseBranch();
  const mergeBase = runGit(["merge-base", "HEAD", base]);

  if (mergeBase === null) {
    return [];
  }

  const output = runGit([
    "diff",
    "--name-only",
    `${mergeBase}..HEAD`,
    "--",
    ".changeset/",
  ]);

  if (output === null) {
    return [];
  }

  return output.split("\n").filter(isChangesetFile);
};

export const loadPublicPackageNames = (): Map<string, string> => {
  const packages = new Map<string, string>();
  const glob = new Glob("*/package.json");

  for (const packageJsonPath of glob.scanSync({
    cwd: publicPackagesRoot,
    onlyFiles: true,
  })) {
    const dirName = packageJsonPath.replace(packageJsonPathPattern, "");
    const prefix = `packages/public/${dirName}/`;
    const { name } = JSON.parse(
      readTextFile(join(publicPackagesRoot, packageJsonPath))
    ) as { name?: string };

    if (name !== undefined && name.length > 0) {
      packages.set(prefix, name);
    }
  }

  return packages;
};

export const changedPublicPackages = (
  files: string[],
  publicPackages: Map<string, string>
): string[] => {
  const changed = new Set<string>();

  for (const file of files) {
    if (!isPublishablePublicChange(file)) {
      continue;
    }

    for (const [prefix, packageName] of publicPackages) {
      if (file.startsWith(prefix)) {
        changed.add(packageName);
      }
    }
  }

  return [...changed].toSorted();
};

export const needsChangesetDecision = (
  stagedFiles: string[],
  changedPackages: string[]
): boolean => {
  if (changedPackages.length === 0 || isVersionOnlyPublicChange(stagedFiles)) {
    return false;
  }

  const hasStagedChangeset = stagedFiles.some(isChangesetFile);
  const hasExistingBranchChangeset = branchChangesetFiles().length > 0;

  return !(hasStagedChangeset || hasExistingBranchChangeset);
};

export const buildChangesetContents = (
  packageBumps: Readonly<Record<string, Bump>>,
  summary: string
): string => {
  const frontmatter = Object.entries(packageBumps)
    .map(([name, bump]) => `"${name}": ${bump}`)
    .join("\n");

  return `---\n${frontmatter}\n---\n\n${summary}\n`;
};

export const stageFile = (relativePath: string): void => {
  const result = Bun.spawnSync(["git", "add", relativePath], {
    cwd: repoRoot,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to stage ${relativePath}`);
  }
};

export const writeIntent = async (intent: ChangesetIntent): Promise<void> => {
  await Bun.write(intentPath, `${JSON.stringify(intent, null, 2)}\n`);
};

export const readIntent = async (): Promise<ChangesetIntent | null> => {
  const file = Bun.file(intentPath);

  if (!(await file.exists())) {
    return null;
  }

  return JSON.parse(await file.text()) as ChangesetIntent;
};

export const clearIntent = async (): Promise<void> => {
  const file = Bun.file(intentPath);

  if (await file.exists()) {
    const { unlink } = await import("node:fs/promises");
    await unlink(intentPath);
  }
};

export const createAndStageChangeset = async ({
  bump,
  packages,
  summary,
}: {
  bump: Bump;
  packages: string[];
  summary: string;
}): Promise<string> => {
  const packageBumps = Object.fromEntries(
    packages.map((name) => [name, bump])
  ) as Record<string, Bump>;

  const filename = `auto-${Bun.hash.wyhash(`${summary}:${packages.join(",")}:${bump}`).toString(16)}.md`;
  const relativePath = `.changeset/${filename}`;
  const absolutePath = join(changesetDir, filename);
  const contents = buildChangesetContents(packageBumps, summary);

  await Bun.write(absolutePath, contents);
  stageFile(relativePath);
  await Bun.write(pendingChangesetMarkerPath, relativePath);

  return relativePath;
};

const conventionalCommitPattern = /^(\w+)(?:\([\w.-]+\))?!?:\s*(.+)$/;

export const parseCommitMessage = (commitMessagePath: string) => {
  const raw = readTextFile(commitMessagePath);
  const lines = raw.split("\n");
  const firstLine =
    lines.find((line) => line.trim().length > 0 && !line.startsWith("#")) ?? "";

  const match = conventionalCommitPattern.exec(firstLine);
  const type = match?.[1] ?? "chore";
  const subject =
    match?.[2]?.trim() || firstLine.trim() || "Update public packages";
  const breaking =
    firstLine.includes("!:") ||
    raw.includes("\nBREAKING CHANGE:") ||
    raw.includes("\nBREAKING-CHANGE:");

  return { breaking, subject, type };
};

export const bumpFromCommit = (type: string, breaking: boolean): Bump => {
  if (breaking) {
    return "major";
  }

  if (type === "feat") {
    return "minor";
  }

  return "patch";
};
