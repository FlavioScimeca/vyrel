import { Glob } from "bun";

const repoRoot = new URL("../", import.meta.url).pathname;
const publicPackagesRoot = `${repoRoot}packages/public`;
const changesetDir = `${repoRoot}.changeset`;

type Bump = "major" | "minor" | "patch";

const publicTestFilePattern = /\.(test|spec)\.(ts|tsx)$/;
const packageJsonPathPattern = /\/package\.json$/;
const conventionalCommitPattern = /^(\w+)(?:\([\w.-]+\))?!?:\s*(.+)$/;

const readTextFile = (path: string): string => {
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

const runGit = (args: string[]): string | null => {
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

const listStagedFiles = (): string[] => {
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

const isPublishablePublicChange = (file: string): boolean => {
  if (!file.startsWith("packages/public/")) {
    return false;
  }

  return !publicTestFilePattern.test(file);
};

const isChangesetFile = (file: string): boolean =>
  file.startsWith(".changeset/") &&
  file.endsWith(".md") &&
  !file.endsWith("README.md");

const resolveBaseBranch = (): string => {
  if (runGit(["rev-parse", "--verify", "origin/main"]) !== null) {
    return "origin/main";
  }

  if (runGit(["rev-parse", "--verify", "main"]) !== null) {
    return "main";
  }

  return "HEAD~1";
};

const branchChangesetFiles = (): string[] => {
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

const loadPublicPackageNames = (): Map<string, string> => {
  const packages = new Map<string, string>();
  const glob = new Glob("*/package.json");

  for (const packageJsonPath of glob.scanSync({
    cwd: publicPackagesRoot,
    onlyFiles: true,
  })) {
    const dirName = packageJsonPath.replace(packageJsonPathPattern, "");
    const prefix = `packages/public/${dirName}/`;
    const { name } = JSON.parse(
      readTextFile(`${publicPackagesRoot}/${packageJsonPath}`)
    ) as { name?: string };

    if (name !== undefined && name.length > 0) {
      packages.set(prefix, name);
    }
  }

  return packages;
};

const changedPublicPackages = (
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

const parseCommitMessage = (commitMessagePath: string) => {
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

const bumpFromCommit = (type: string, breaking: boolean): Bump => {
  if (breaking) {
    return "major";
  }

  if (type === "feat") {
    return "minor";
  }

  return "patch";
};

const buildChangesetContents = (
  packageBumps: Readonly<Record<string, Bump>>,
  summary: string
) => {
  const frontmatter = Object.entries(packageBumps)
    .map(([name, bump]) => `"${name}": ${bump}`)
    .join("\n");

  return `---\n${frontmatter}\n---\n\n${summary}\n`;
};

const stageFile = (relativePath: string) => {
  const result = Bun.spawnSync(["git", "add", relativePath], {
    cwd: repoRoot,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to stage ${relativePath}`);
  }
};

const writeLog = (message: string) => {
  process.stderr.write(`${message}\n`);
};

const [messagePath, source = "message"] = process.argv.slice(2);

if (
  Bun.env.SKIP_CHANGESET !== "1" &&
  source !== "merge" &&
  source !== "squash"
) {
  const stagedFiles = listStagedFiles();
  const publicPackages = loadPublicPackageNames();
  const changedPackages = changedPublicPackages(stagedFiles, publicPackages);

  if (changedPackages.length > 0) {
    const hasStagedChangeset = stagedFiles.some(isChangesetFile);
    const hasExistingBranchChangeset = branchChangesetFiles().length > 0;

    if (!(hasStagedChangeset || hasExistingBranchChangeset)) {
      if (messagePath === undefined) {
        writeLog(
          "Public package files are staged without a changeset, but no commit message file was provided."
        );
      } else {
        const { breaking, subject, type } = parseCommitMessage(messagePath);
        const bump = bumpFromCommit(type, breaking);
        const packageBumps = Object.fromEntries(
          changedPackages.map((name) => [name, bump])
        ) as Record<string, Bump>;

        const filename = `auto-${Bun.hash.wyhash(`${subject}:${changedPackages.join(",")}`).toString(16)}.md`;
        const relativePath = `.changeset/${filename}`;
        const absolutePath = `${changesetDir}/${filename}`;
        const contents = buildChangesetContents(packageBumps, subject);

        await Bun.write(absolutePath, contents);
        stageFile(relativePath);

        const bumpSummary = changedPackages
          .map((name) => `${name}: ${bump}`)
          .join(", ");

        writeLog(`Created changeset ${relativePath} (${bumpSummary})`);
      }
    }
  }
}
