import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Glob } from "bun";
import { Effect, Schema } from "effect";
import type { ParseError } from "effect/ParseResult";
import { scriptRuntime } from "./runtime";

const bumpSchema = Schema.Literal("major", "minor", "patch");

const changesetIntentSchema = Schema.Union(
  Schema.Struct({ action: Schema.Literal("skip") }),
  Schema.Struct({
    action: Schema.Literal("create"),
    bump: bumpSchema,
    packages: Schema.Array(Schema.String),
  })
);

/** Semver bump — derived from Effect Schema so encode/decode stay aligned. */
export type Bump = Schema.Schema.Type<typeof bumpSchema>;

/** Changeset intent — `packages` is readonly to match `Schema.Array`. */
export type ChangesetIntent = Schema.Schema.Type<typeof changesetIntentSchema>;

const paths = scriptRuntime.runSync(
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const root = path.resolve(import.meta.dirname, "..");

    return {
      changesetDir: path.join(root, ".changeset"),
      intentPath: path.join(root, ".git/vyrel-changeset-intent.json"),
      pendingChangesetMarkerPath: path.join(
        root,
        ".git/vyrel-pending-changeset"
      ),
      publicPackagesRoot: path.join(root, "packages/public"),
      repoRoot: root,
    };
  })
);

const {
  changesetDir,
  intentPath,
  pendingChangesetMarkerPath,
  publicPackagesRoot,
  repoRoot,
} = paths;

export {
  changesetDir,
  intentPath,
  pendingChangesetMarkerPath,
  publicPackagesRoot,
  repoRoot,
};

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

export const headChangesetFiles = (): string[] => {
  const output = runGit(["ls-files", ".changeset"]);

  if (output === null) {
    return [];
  }

  return output.split("\n").filter(isChangesetFile);
};

export const getChangesetSkipReason = (
  stagedFiles: string[],
  changedPackages: string[]
): string | null => {
  if (changedPackages.length === 0) {
    return null;
  }

  if (isVersionOnlyPublicChange(stagedFiles)) {
    return "Only version/changelog files changed — no new changeset needed";
  }

  if (stagedFiles.some(isChangesetFile)) {
    return "Changeset already staged for this commit";
  }

  const existingChangesets = headChangesetFiles();

  if (existingChangesets.length > 0) {
    return `Branch already has a changeset: ${existingChangesets.join(", ")}`;
  }

  return null;
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
      readTextFile(`${publicPackagesRoot}/${packageJsonPath}`)
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
  const hasExistingChangeset = headChangesetFiles().length > 0;

  return !(hasStagedChangeset || hasExistingChangeset);
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

const encodeIntentJson = Schema.encode(Schema.parseJson(changesetIntentSchema));
const decodeIntentJson = Schema.decodeUnknown(
  Schema.parseJson(changesetIntentSchema)
);

export const writeIntent = (
  intent: ChangesetIntent
): Effect.Effect<void, ParseError> =>
  Effect.gen(function* () {
    const json = yield* encodeIntentJson(intent);
    yield* Effect.promise(() => Bun.write(intentPath, `${json}\n`));
  });

export const readIntent = (): Effect.Effect<
  ChangesetIntent | null,
  ParseError
> =>
  Effect.gen(function* () {
    const file = Bun.file(intentPath);
    const exists = yield* Effect.promise(() => file.exists());

    if (!exists) {
      return null;
    }

    const text = yield* Effect.promise(() => file.text());
    return yield* decodeIntentJson(text);
  });

export const clearIntent = (): Effect.Effect<
  void,
  PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    if (yield* fs.exists(intentPath)) {
      yield* fs.remove(intentPath);
    }
  });

export const createAndStageChangeset = ({
  bump,
  packages,
  summary,
}: {
  bump: Bump;
  packages: readonly string[];
  summary: string;
}): Effect.Effect<string> =>
  Effect.gen(function* () {
    const packageBumps = Object.fromEntries(
      packages.map((name) => [name, bump])
    ) as Record<string, Bump>;

    const filename = `auto-${Bun.hash.wyhash(`${summary}:${packages.join(",")}:${bump}`).toString(16)}.md`;
    const relativePath = `.changeset/${filename}`;
    const absolutePath = `${changesetDir}/${filename}`;
    const contents = buildChangesetContents(packageBumps, summary);

    yield* Effect.promise(() => Bun.write(absolutePath, contents));
    stageFile(relativePath);
    yield* Effect.promise(() =>
      Bun.write(pendingChangesetMarkerPath, relativePath)
    );

    return relativePath;
  });

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
