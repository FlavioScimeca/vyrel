import { readdirSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { findNodeModulesDirs } from "./check-nm";

const RECURSE_SKIP = new Set([
  ".git",
  ".next",
  ".output",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

export type CleanupKind = "dist" | ".turbo" | "node_modules";

export interface CleanupTarget {
  kind: CleanupKind;
  path: string;
  relativePath: string;
}

export interface CleanupReport {
  deleted: CleanupTarget[];
  errors: { message: string; path: string }[];
  root: string;
  skippedCacheOnly: CleanupTarget[];
}

const colors = {
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
} as const;

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function findNestedDirs(repoRoot: string, dirName: string): CleanupTarget[] {
  const root = resolve(repoRoot);
  const results: CleanupTarget[] = [];

  function walk(dir: string): void {
    let entries: { isDirectory: () => boolean; name: string }[];

    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryName = entry.name;

      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = join(dir, entryName);
      const relativePath = relative(root, fullPath);

      if (entryName === dirName) {
        if (relativePath !== dirName) {
          results.push({
            kind: dirName as CleanupKind,
            path: fullPath,
            relativePath,
          });
        }
        continue;
      }

      if (RECURSE_SKIP.has(entryName)) {
        continue;
      }

      if (entryName.startsWith(".")) {
        continue;
      }

      walk(fullPath);
    }
  }

  walk(root);

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function findNestedNodeModules(repoRoot: string): {
  deletable: CleanupTarget[];
  skippedCacheOnly: CleanupTarget[];
} {
  const deletable: CleanupTarget[] = [];
  const skippedCacheOnly: CleanupTarget[] = [];

  for (const entry of findNodeModulesDirs(repoRoot)) {
    if (entry.isRoot) {
      continue;
    }

    const target: CleanupTarget = {
      kind: "node_modules",
      path: entry.path,
      relativePath: entry.relativePath,
    };

    if (entry.isCacheOnly) {
      skippedCacheOnly.push(target);
      continue;
    }

    deletable.push(target);
  }

  return { deletable, skippedCacheOnly };
}

export function collectCleanupTargets(repoRoot: string): {
  skippedCacheOnly: CleanupTarget[];
  targets: CleanupTarget[];
} {
  const { deletable, skippedCacheOnly } = findNestedNodeModules(repoRoot);
  const targets = [
    ...findNestedDirs(repoRoot, "dist"),
    ...findNestedDirs(repoRoot, ".turbo"),
    ...deletable,
  ].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { skippedCacheOnly, targets };
}

export function cleanupRepo(repoRoot: string): CleanupReport {
  const root = resolve(repoRoot);
  const { skippedCacheOnly, targets } = collectCleanupTargets(root);
  const deleted: CleanupTarget[] = [];
  const errors: CleanupReport["errors"] = [];

  for (const target of targets) {
    try {
      rmSync(target.path, { force: true, recursive: true });
      deleted.push(target);
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : String(error),
        path: target.relativePath,
      });
    }
  }

  return { deleted, errors, root, skippedCacheOnly };
}

function printSection(title: string): void {
  console.log("");
  console.log(colorize(title, "bold"));
  console.log(colorize("─".repeat(60), "dim"));
}

function countByKind(targets: CleanupTarget[]): Record<CleanupKind, number> {
  return {
    ".turbo": targets.filter((target) => target.kind === ".turbo").length,
    dist: targets.filter((target) => target.kind === "dist").length,
    node_modules: targets.filter((target) => target.kind === "node_modules")
      .length,
  };
}

export function printCleanupReport(report: CleanupReport): void {
  const deletedCounts = countByKind(report.deleted);

  console.log("");
  console.log(colorize("repo cleanup", "bold"));
  console.log(colorize("═".repeat(60), "dim"));
  console.log(`  ${colorize("repo", "cyan")}     ${report.root}`);
  console.log(
    `  ${colorize("deleted", "cyan")}  ${colorize(String(report.deleted.length), report.deleted.length > 0 ? "green" : "dim")} paths`
  );
  console.log(
    `  ${colorize("skipped", "cyan")}  ${report.skippedCacheOnly.length} cache-only node_modules`
  );

  if (report.deleted.length > 0) {
    printSection("Deleted");
    console.log(
      colorize(
        `  dist: ${deletedCounts.dist}  ·  .turbo: ${deletedCounts[".turbo"]}  ·  node_modules: ${deletedCounts.node_modules}`,
        "dim"
      )
    );

    for (const target of report.deleted) {
      console.log(`  ${colorize("✓", "green")} ${target.relativePath}`);
    }
  } else {
    printSection("Deleted");
    console.log(colorize("  nothing to clean", "dim"));
  }

  if (report.skippedCacheOnly.length > 0) {
    printSection(
      `Skipped cache-only node_modules (${report.skippedCacheOnly.length})`
    );

    for (const target of report.skippedCacheOnly) {
      console.log(colorize(`  ${target.relativePath}`, "dim"));
    }
  }

  if (report.errors.length > 0) {
    printSection("Errors");

    for (const error of report.errors) {
      console.log(`  ${colorize("✗", "red")} ${error.path} — ${error.message}`);
    }
  }

  console.log("");
}

function resolveRepoRoot(): string {
  return resolve(import.meta.dirname, "..");
}

if (import.meta.main) {
  const report = cleanupRepo(resolveRepoRoot());
  printCleanupReport(report);
  process.exit(report.errors.length > 0 ? 1 : 0);
}
