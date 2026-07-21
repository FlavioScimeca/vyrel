import { FileSystem, Path } from "@effect/platform";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import { Effect, Option } from "effect";
import { findNodeModulesDirs } from "./check-nm";
import { scriptRuntime } from "./runtime";

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

const shouldSkipDirectory = (entryName: string): boolean =>
  RECURSE_SKIP.has(entryName) || entryName.startsWith(".");

const findNestedDirs = (
  repoRoot: string,
  dirName: string
): Effect.Effect<CleanupTarget[], never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.resolve(repoRoot);
    const results: CleanupTarget[] = [];

    const visitDirectory = (
      entryName: string,
      fullPath: string
    ): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
      Effect.gen(function* () {
        const relativePath = path.relative(root, fullPath);

        if (entryName === dirName) {
          if (relativePath !== dirName) {
            results.push({
              kind: dirName as CleanupKind,
              path: fullPath,
              relativePath,
            });
          }
          return;
        }

        if (shouldSkipDirectory(entryName)) {
          return;
        }

        yield* walk(fullPath);
      });

    const walk = (
      dir: string
    ): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
      Effect.gen(function* () {
        const entries = yield* fs
          .readDirectory(dir)
          .pipe(Effect.orElseSucceed(() => [] as string[]));

        for (const entryName of entries) {
          const fullPath = path.join(dir, entryName);
          const info = yield* fs.stat(fullPath).pipe(Effect.option);

          if (Option.isNone(info) || info.value.type !== "Directory") {
            continue;
          }

          yield* visitDirectory(entryName, fullPath);
        }
      });

    yield* walk(root);

    return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  });

const findNestedNodeModules = (
  repoRoot: string
): Effect.Effect<
  { deletable: CleanupTarget[]; skippedCacheOnly: CleanupTarget[] },
  never,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const deletable: CleanupTarget[] = [];
    const skippedCacheOnly: CleanupTarget[] = [];

    const entries = yield* findNodeModulesDirs(repoRoot);

    for (const entry of entries) {
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
  });

export const collectCleanupTargets = (
  repoRoot: string
): Effect.Effect<
  { skippedCacheOnly: CleanupTarget[]; targets: CleanupTarget[] },
  never,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const { deletable, skippedCacheOnly } =
      yield* findNestedNodeModules(repoRoot);
    const distTargets = yield* findNestedDirs(repoRoot, "dist");
    const turboTargets = yield* findNestedDirs(repoRoot, ".turbo");
    const targets = [...distTargets, ...turboTargets, ...deletable].sort(
      (a, b) => a.relativePath.localeCompare(b.relativePath)
    );

    return { skippedCacheOnly, targets };
  });

export const cleanupRepo = (
  repoRoot: string
): Effect.Effect<CleanupReport, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.resolve(repoRoot);
    const { skippedCacheOnly, targets } = yield* collectCleanupTargets(root);
    const deleted: CleanupTarget[] = [];
    const errors: CleanupReport["errors"] = [];

    for (const target of targets) {
      const result = yield* fs
        .remove(target.path, { force: true, recursive: true })
        .pipe(Effect.either);

      if (result._tag === "Left") {
        errors.push({
          message: result.left.message,
          path: target.relativePath,
        });
      } else {
        deleted.push(target);
      }
    }

    return { deleted, errors, root, skippedCacheOnly };
  });

const printSection = (title: string): Effect.Effect<void> =>
  Effect.sync(() => {
    log.info("clean-up", "");
    log.info("clean-up", colorize(title, "bold"));
    log.info("clean-up", colorize("─".repeat(60), "dim"));
  });

function countByKind(targets: CleanupTarget[]): Record<CleanupKind, number> {
  return {
    ".turbo": targets.filter((target) => target.kind === ".turbo").length,
    dist: targets.filter((target) => target.kind === "dist").length,
    node_modules: targets.filter((target) => target.kind === "node_modules")
      .length,
  };
}

export const printCleanupReport = (
  report: CleanupReport
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const deletedCounts = countByKind(report.deleted);

    log.info("clean-up", "");
    log.info("clean-up", colorize("repo cleanup", "bold"));
    log.info("clean-up", colorize("═".repeat(60), "dim"));
    log.info("clean-up", `  ${colorize("repo", "cyan")}     ${report.root}`);
    log.info(
      "clean-up",
      `  ${colorize("deleted", "cyan")}  ${colorize(String(report.deleted.length), report.deleted.length > 0 ? "green" : "dim")} paths`
    );
    log.info(
      "clean-up",
      `  ${colorize("skipped", "cyan")}  ${report.skippedCacheOnly.length} cache-only node_modules`
    );

    if (report.deleted.length > 0) {
      yield* printSection("Deleted");
      log.info(
        "clean-up",
        colorize(
          `  dist: ${deletedCounts.dist}  ·  .turbo: ${deletedCounts[".turbo"]}  ·  node_modules: ${deletedCounts.node_modules}`,
          "dim"
        )
      );

      for (const target of report.deleted) {
        log.info(
          "clean-up",
          `  ${colorize("✓", "green")} ${target.relativePath}`
        );
      }
    } else {
      yield* printSection("Deleted");
      log.info("clean-up", colorize("  nothing to clean", "dim"));
    }

    if (report.skippedCacheOnly.length > 0) {
      yield* printSection(
        `Skipped cache-only node_modules (${report.skippedCacheOnly.length})`
      );

      for (const target of report.skippedCacheOnly) {
        log.info("clean-up", colorize(`  ${target.relativePath}`, "dim"));
      }
    }

    if (report.errors.length > 0) {
      yield* printSection("Errors");

      for (const error of report.errors) {
        log.info(
          "clean-up",
          `  ${colorize("✗", "red")} ${error.path} — ${error.message}`
        );
      }
    }

    log.info("clean-up", "");
  });

const resolveRepoRoot = Effect.gen(function* () {
  const path = yield* Path.Path;
  return path.resolve(import.meta.dirname, "..");
});

if (import.meta.main) {
  initScriptLogging({ script: "clean-up" });
  const exitCode = await scriptRuntime.runPromise(
    Effect.gen(function* () {
      const repoRoot = yield* resolveRepoRoot;
      const report = yield* cleanupRepo(repoRoot);
      yield* printCleanupReport(report);
      return report.errors.length > 0 ? 1 : 0;
    })
  );
  process.exit(exitCode);
}
