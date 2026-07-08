import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/** Entries that indicate a node_modules folder is only used for tooling caches. */
const CACHE_ONLY_ENTRIES = new Set([
  ".cache",
  ".eslintcache",
  ".parcel-cache",
  ".rollup.cache",
  ".temp",
  ".tmp",
  ".turbo",
  ".vite",
  ".vite-temp",
  ".vitest",
]);

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".output",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

export interface NodeModulesEntry {
  entries: string[];
  isCacheOnly: boolean;
  isRoot: boolean;
  path: string;
  relativePath: string;
}

export interface NodeModulesReport {
  all: NodeModulesEntry[];
  cacheOnly: NodeModulesEntry[];
  isHealthy: boolean;
  real: NodeModulesEntry[];
  root: string;
}

function isCacheOnlyNodeModules(entries: string[]): boolean {
  if (entries.length === 0) {
    return true;
  }

  return entries.every((entry) => CACHE_ONLY_ENTRIES.has(entry));
}

function listNodeModulesEntries(nodeModulesPath: string): string[] {
  try {
    return readdirSync(nodeModulesPath);
  } catch {
    return [];
  }
}

function walkForNodeModules(
  dir: string,
  results: NodeModulesEntry[],
  root: string
): void {
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

    if (entryName === "node_modules") {
      const children = listNodeModulesEntries(fullPath);
      const relativePath = relative(root, fullPath) || "node_modules";

      results.push({
        entries: children,
        isCacheOnly: isCacheOnlyNodeModules(children),
        isRoot: relativePath === "node_modules",
        path: fullPath,
        relativePath,
      });
      continue;
    }

    if (SKIP_DIRS.has(entryName) || entryName.startsWith(".")) {
      continue;
    }

    walkForNodeModules(fullPath, results, root);
  }
}

export function findNodeModulesDirs(repoRoot: string): NodeModulesEntry[] {
  const root = resolve(repoRoot);
  const results: NodeModulesEntry[] = [];

  walkForNodeModules(root, results, root);

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function checkNodeModules(repoRoot: string): NodeModulesReport {
  const root = resolve(repoRoot);
  const all = findNodeModulesDirs(root);
  const cacheOnly = all.filter((entry) => entry.isCacheOnly);
  const real = all.filter((entry) => !entry.isCacheOnly);
  const hasOnlyRootNodeModules = real.length === 1 && real[0]?.isRoot === true;

  return {
    all,
    cacheOnly,
    isHealthy: hasOnlyRootNodeModules,
    real,
    root,
  };
}

function formatEntrySummary(entry: NodeModulesEntry): string {
  if (entry.entries.length === 0) {
    return "(empty)";
  }

  const preview = entry.entries
    .filter((name) => name !== ".bin")
    .slice(0, 4)
    .join(", ");

  const packageCount = entry.entries.filter((name) => name !== ".bin").length;
  const suffix = packageCount > 4 ? `, +${packageCount - 4} more` : "";

  return preview ? `${preview}${suffix}` : `${packageCount} packages`;
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

function pad(text: string, width: number): string {
  return text.length >= width
    ? text
    : `${text}${" ".repeat(width - text.length)}`;
}

function printSection(title: string): void {
  console.log("");
  console.log(colorize(title, "bold"));
  console.log(colorize("─".repeat(60), "dim"));
}

export function printNodeModulesReport(report: NodeModulesReport): void {
  const nested = report.real.filter((entry) => !entry.isRoot);
  const rootEntry = report.real.find((entry) => entry.isRoot);

  console.log("");
  console.log(colorize("node_modules check", "bold"));
  console.log(colorize("═".repeat(60), "dim"));
  console.log(`  ${colorize("repo", "cyan")}    ${report.root}`);

  if (report.real.length === 0) {
    console.log(
      `  ${colorize("status", "cyan")}  ${colorize("no node_modules found", "yellow")}`
    );
    console.log("");
    return;
  }

  if (report.isHealthy && rootEntry) {
    console.log(
      `  ${colorize("status", "cyan")}  ${colorize("OK", "green")} — only root node_modules`
    );
    console.log(
      `  ${colorize("found", "cyan")}   ${rootEntry.entries.length.toLocaleString()} entries in node_modules`
    );
    console.log("");
    return;
  }

  console.log(
    `  ${colorize("status", "cyan")}  ${colorize("NOT OK", "red")} — ${nested.length} nested node_modules`
  );
  console.log(
    `  ${colorize("found", "cyan")}   ${report.real.length} total (${rootEntry ? "1 root" : "0 root"}, ${nested.length} nested)`
  );

  printSection("Installs");

  const pathWidth = Math.max(
    "path".length,
    ...report.real.map((entry) => entry.relativePath.length)
  );

  console.log(
    colorize(`  ${pad("kind", 9)} ${pad("path", pathWidth)}  entries`, "dim")
  );

  const sorted = [
    ...report.real.filter((entry) => entry.isRoot),
    ...report.real
      .filter((entry) => !entry.isRoot)
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
  ];

  for (const entry of sorted) {
    const kind = entry.isRoot ? "root" : "nested";
    const kindColor = entry.isRoot ? "green" : "red";
    const marker = entry.isRoot ? "✓" : "✗";
    const count = entry.entries.length.toLocaleString();
    const kindLabel = `${marker} ${kind}`;

    console.log(
      `  ${colorize(pad(kindLabel, 9), kindColor)} ${pad(entry.relativePath, pathWidth)}  ${count}`
    );
    console.log(colorize(`    ${formatEntrySummary(entry)}`, "dim"));
  }

  if (report.cacheOnly.length > 0) {
    printSection(`Ignored cache-only (${report.cacheOnly.length})`);

    for (const entry of report.cacheOnly) {
      console.log(
        colorize(
          `  ${entry.relativePath} — ${formatEntrySummary(entry)}`,
          "dim"
        )
      );
    }
  }

  printSection("Next step");
  console.log(
    colorize(
      "  Run `bun install` from the repo root, then remove nested node_modules.",
      "dim"
    )
  );
  console.log("");
}

function resolveRepoRoot(): string {
  return resolve(import.meta.dirname, "..");
}

if (import.meta.main) {
  const report = checkNodeModules(resolveRepoRoot());
  printNodeModulesReport(report);
  process.exit(report.isHealthy ? 0 : 1);
}
