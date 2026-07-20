import { FileSystem, Path } from "@effect/platform";
import { Effect, Option } from "effect";
import { scriptRuntime } from "./runtime";

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

const listNodeModulesEntries = (
  nodeModulesPath: string
): Effect.Effect<string[], never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs
      .readDirectory(nodeModulesPath)
      .pipe(Effect.orElseSucceed(() => [] as string[]));
  });

const walkForNodeModules = (
  dir: string,
  results: NodeModulesEntry[],
  root: string
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const entries = yield* fs
      .readDirectory(dir)
      .pipe(Effect.orElseSucceed(() => [] as string[]));

    for (const entryName of entries) {
      const fullPath = path.join(dir, entryName);
      const info = yield* fs.stat(fullPath).pipe(Effect.option);

      if (Option.isNone(info) || info.value.type !== "Directory") {
        continue;
      }

      if (entryName === "node_modules") {
        const children = yield* listNodeModulesEntries(fullPath);
        const relativePath = path.relative(root, fullPath) || "node_modules";

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

      yield* walkForNodeModules(fullPath, results, root);
    }
  });

export const findNodeModulesDirs = (
  repoRoot: string
): Effect.Effect<
  NodeModulesEntry[],
  never,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const root = path.resolve(repoRoot);
    const results: NodeModulesEntry[] = [];

    yield* walkForNodeModules(root, results, root);

    return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  });

export const checkNodeModules = (
  repoRoot: string
): Effect.Effect<NodeModulesReport, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const root = path.resolve(repoRoot);
    const all = yield* findNodeModulesDirs(root);
    const cacheOnly = all.filter((entry) => entry.isCacheOnly);
    const real = all.filter((entry) => !entry.isCacheOnly);
    const hasOnlyRootNodeModules =
      real.length === 1 && real[0]?.isRoot === true;

    return {
      all,
      cacheOnly,
      isHealthy: hasOnlyRootNodeModules,
      real,
      root,
    };
  });

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

  return preview.length > 0
    ? `${preview}${suffix}`
    : `${packageCount} packages`;
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

const printSection = (title: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log("");
    yield* Effect.log(colorize(title, "bold"));
    yield* Effect.log(colorize("─".repeat(60), "dim"));
  });

const printReportHeader = (report: NodeModulesReport): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log("");
    yield* Effect.log(colorize("node_modules check", "bold"));
    yield* Effect.log(colorize("═".repeat(60), "dim"));
    yield* Effect.log(`  ${colorize("repo", "cyan")}    ${report.root}`);
  });

const printHealthyStatus = (rootEntry: NodeModulesEntry): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(
      `  ${colorize("status", "cyan")}  ${colorize("OK", "green")} — only root node_modules`
    );
    yield* Effect.log(
      `  ${colorize("found", "cyan")}   ${rootEntry.entries.length.toLocaleString()} entries in node_modules`
    );
    yield* Effect.log("");
  });

const printUnhealthyStatus = (
  nestedCount: number,
  totalCount: number,
  hasRoot: boolean
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(
      `  ${colorize("status", "cyan")}  ${colorize("NOT OK", "red")} — ${nestedCount} nested node_modules`
    );
    yield* Effect.log(
      `  ${colorize("found", "cyan")}   ${totalCount} total (${hasRoot ? "1 root" : "0 root"}, ${nestedCount} nested)`
    );
  });

const printInstallRows = (report: NodeModulesReport): Effect.Effect<void> =>
  Effect.gen(function* () {
    const pathWidth = Math.max(
      "path".length,
      ...report.real.map((entry) => entry.relativePath.length)
    );

    yield* Effect.log(
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

      yield* Effect.log(
        `  ${colorize(pad(kindLabel, 9), kindColor)} ${pad(entry.relativePath, pathWidth)}  ${count}`
      );
      yield* Effect.log(colorize(`    ${formatEntrySummary(entry)}`, "dim"));
    }
  });

const printCacheOnlySection = (
  cacheOnly: NodeModulesEntry[]
): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (cacheOnly.length === 0) {
      return;
    }

    yield* printSection(`Ignored cache-only (${cacheOnly.length})`);

    for (const entry of cacheOnly) {
      yield* Effect.log(
        colorize(
          `  ${entry.relativePath} — ${formatEntrySummary(entry)}`,
          "dim"
        )
      );
    }
  });

export const printNodeModulesReport = (
  report: NodeModulesReport
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const nested = report.real.filter((entry) => !entry.isRoot);
    const rootEntry = report.real.find((entry) => entry.isRoot);

    yield* printReportHeader(report);

    if (report.real.length === 0) {
      yield* Effect.log(
        `  ${colorize("status", "cyan")}  ${colorize("no node_modules found", "yellow")}`
      );
      yield* Effect.log("");
      return;
    }

    if (report.isHealthy && rootEntry !== undefined) {
      yield* printHealthyStatus(rootEntry);
      return;
    }

    yield* printUnhealthyStatus(
      nested.length,
      report.real.length,
      rootEntry !== undefined
    );
    yield* printSection("Installs");
    yield* printInstallRows(report);
    yield* printCacheOnlySection(report.cacheOnly);

    yield* printSection("Next step");
    yield* Effect.log(
      colorize(
        "  Run `bun install` from the repo root, then remove nested node_modules.",
        "dim"
      )
    );
    yield* Effect.log("");
  });

const resolveRepoRoot = Effect.gen(function* () {
  const path = yield* Path.Path;
  return path.resolve(import.meta.dirname, "..");
});

if (import.meta.main) {
  const exitCode = await scriptRuntime.runPromise(
    Effect.gen(function* () {
      const repoRoot = yield* resolveRepoRoot;
      const report = yield* checkNodeModules(repoRoot);
      yield* printNodeModulesReport(report);
      return report.isHealthy ? 0 : 1;
    })
  );
  process.exit(exitCode);
}
