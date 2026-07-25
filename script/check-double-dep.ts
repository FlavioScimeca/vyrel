import { FileSystem, Path } from "@effect/platform";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import { Effect, Option, Schema } from "effect";
import { scriptRuntime } from "./runtime";

const DEP_FIELDS = ["dependencies", "devDependencies"] as const;

const PackageJsonSchema = Schema.Struct({
  dependencies: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String })
  ),
  devDependencies: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String })
  ),
  name: Schema.optional(Schema.String),
  workspaces: Schema.optional(
    Schema.Struct({
      catalog: Schema.optional(
        Schema.Record({ key: Schema.String, value: Schema.String })
      ),
      packages: Schema.optional(Schema.Array(Schema.String)),
    })
  ),
});

type PackageJson = typeof PackageJsonSchema.Type;

export interface DepOccurrence {
  field: (typeof DEP_FIELDS)[number];
  packageName: string;
  relativePath: string;
  version: string;
}

export interface DuplicateDep {
  name: string;
  packages: DepOccurrence[];
  version: string;
}

export interface DoubleDepReport {
  catalogSize: number;
  duplicates: DuplicateDep[];
  packageCount: number;
  root: string;
}

const colors = {
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
} as const;

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function shouldSkipVersion(version: string): boolean {
  return version.startsWith("catalog:") || version.startsWith("workspace:");
}

function expandWorkspaceGlob(
  pattern: string,
  repoRoot: string
): Effect.Effect<string[], never, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    if (!pattern.includes("*")) {
      const packageJsonPath = path.join(repoRoot, pattern, "package.json");
      const exists = yield* fs
        .exists(packageJsonPath)
        .pipe(Effect.orElseSucceed(() => false));
      return exists ? [packageJsonPath] : [];
    }

    // Supports `apps/*` and nested `packages/public/*`
    if (!pattern.endsWith("/*")) {
      return [];
    }

    const parentDir = path.join(repoRoot, pattern.slice(0, -2));
    const parentExists = yield* fs
      .exists(parentDir)
      .pipe(Effect.orElseSucceed(() => false));

    if (!parentExists) {
      return [];
    }

    const entries = yield* fs
      .readDirectory(parentDir)
      .pipe(Effect.orElseSucceed(() => [] as string[]));

    const results: string[] = [];

    for (const entryName of entries) {
      if (entryName.startsWith(".")) {
        continue;
      }

      const packageJsonPath = path.join(parentDir, entryName, "package.json");
      const exists = yield* fs
        .exists(packageJsonPath)
        .pipe(Effect.orElseSucceed(() => false));

      if (exists) {
        results.push(packageJsonPath);
      }
    }

    return results;
  });
}

const readPackageJson = (
  filePath: string
): Effect.Effect<Option.Option<PackageJson>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs.readFileString(filePath).pipe(Effect.option);

    if (Option.isNone(content)) {
      return Option.none();
    }

    return yield* Schema.decodeUnknown(Schema.parseJson(PackageJsonSchema))(
      content.value
    ).pipe(Effect.option);
  });

const collectPackageJsonPaths = (
  repoRoot: string
): Effect.Effect<string[], never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const rootPackageJsonPath = path.join(repoRoot, "package.json");
    const rootPkg = yield* readPackageJson(rootPackageJsonPath);
    const workspacePatterns = Option.match(rootPkg, {
      onNone: () => [] as string[],
      onSome: (pkg) => pkg.workspaces?.packages ?? [],
    });

    const paths = new Set<string>([rootPackageJsonPath]);

    for (const pattern of workspacePatterns) {
      const matched = yield* expandWorkspaceGlob(pattern, repoRoot);
      for (const matchedPath of matched) {
        paths.add(matchedPath);
      }
    }

    return [...paths].sort((a, b) => a.localeCompare(b));
  });

function dedupeByPackage(packages: DepOccurrence[]): DepOccurrence[] {
  const seen = new Map<string, DepOccurrence>();

  for (const occurrence of packages) {
    const existing = seen.get(occurrence.relativePath);
    if (existing === undefined) {
      seen.set(occurrence.relativePath, occurrence);
      continue;
    }

    // Prefer listing dependencies over devDependencies when both exist
    if (
      existing.field === "devDependencies" &&
      occurrence.field === "dependencies"
    ) {
      seen.set(occurrence.relativePath, occurrence);
    }
  }

  return [...seen.values()];
}

function addOccurrencesToGroup(
  grouped: Map<string, DepOccurrence[]>,
  pkg: PackageJson,
  relativeDir: string,
  workspacePackageName: string
): void {
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (deps === undefined) {
      continue;
    }

    for (const [depName, version] of Object.entries(deps)) {
      if (shouldSkipVersion(version)) {
        continue;
      }

      const mapKey = `${depName}\0${version}`;
      const list = grouped.get(mapKey) ?? [];
      list.push({
        field,
        packageName: workspacePackageName,
        relativePath: relativeDir,
        version,
      });
      grouped.set(mapKey, list);
    }
  }
}

function buildDuplicates(
  grouped: Map<string, DepOccurrence[]>
): DuplicateDep[] {
  const duplicates: DuplicateDep[] = [];

  for (const [mapKey, packages] of grouped) {
    const uniquePackages = dedupeByPackage(packages);
    if (uniquePackages.length < 2) {
      continue;
    }

    const separatorIndex = mapKey.indexOf("\0");
    duplicates.push({
      name: mapKey.slice(0, separatorIndex),
      packages: uniquePackages.sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath)
      ),
      version: mapKey.slice(separatorIndex + 1),
    });
  }

  return duplicates.sort((a, b) => {
    const byCount = b.packages.length - a.packages.length;
    if (byCount !== 0) {
      return byCount;
    }
    return a.name.localeCompare(b.name);
  });
}

const groupDependencies = (
  root: string,
  packageJsonPaths: string[]
): Effect.Effect<
  { grouped: Map<string, DepOccurrence[]>; packageCount: number },
  never,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const grouped = new Map<string, DepOccurrence[]>();
    let packageCount = 0;

    for (const packageJsonPath of packageJsonPaths) {
      const pkgOption = yield* readPackageJson(packageJsonPath);
      if (Option.isNone(pkgOption)) {
        continue;
      }

      packageCount += 1;
      const relativeDir =
        path.relative(root, path.dirname(packageJsonPath)) || ".";
      const workspacePackageName = pkgOption.value.name ?? relativeDir;
      addOccurrencesToGroup(
        grouped,
        pkgOption.value,
        relativeDir,
        workspacePackageName
      );
    }

    return { grouped, packageCount };
  });

export const checkDoubleDeps = (
  repoRoot: string
): Effect.Effect<DoubleDepReport, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const root = path.resolve(repoRoot);
    const packageJsonPaths = yield* collectPackageJsonPaths(root);
    const rootPkg = yield* readPackageJson(path.join(root, "package.json"));
    const catalogSize = Option.match(rootPkg, {
      onNone: () => 0,
      onSome: (pkg) => Object.keys(pkg.workspaces?.catalog ?? {}).length,
    });
    const { grouped, packageCount } = yield* groupDependencies(
      root,
      packageJsonPaths
    );

    return {
      catalogSize,
      duplicates: buildDuplicates(grouped),
      packageCount,
      root,
    };
  });

const printHeader = (report: DoubleDepReport): void => {
  log.info("check-double-dep", "");
  log.info("check-double-dep", colorize("duplicate dependency check", "bold"));
  log.info("check-double-dep", colorize("═".repeat(60), "dim"));
  log.info(
    "check-double-dep",
    `  ${colorize("repo", "cyan")}      ${report.root}`
  );
  log.info(
    "check-double-dep",
    `  ${colorize("packages", "cyan")}  ${report.packageCount}`
  );
  log.info(
    "check-double-dep",
    `  ${colorize("catalog", "cyan")}   ${report.catalogSize} entries`
  );
  log.info("check-double-dep", "");
};

const printDuplicates = (duplicates: DuplicateDep[]): void => {
  log.info(
    "check-double-dep",
    colorize("Candidates (same version in 2+ packages)", "bold")
  );
  log.info("check-double-dep", colorize("─".repeat(60), "dim"));

  for (const dup of duplicates) {
    log.info(
      "check-double-dep",
      `  ${colorize(dup.name, "cyan")}${colorize(`@${dup.version}`, "dim")}`
    );

    for (const pkg of dup.packages) {
      const fieldHint =
        pkg.field === "devDependencies" ? colorize(" (dev)", "dim") : "";
      log.info("check-double-dep", `    - ${pkg.relativePath}${fieldHint}`);
    }

    log.info("check-double-dep", "");
  }
};

export const printDoubleDepReport = (
  report: DoubleDepReport
): Effect.Effect<void> =>
  Effect.sync(() => {
    printHeader(report);

    if (report.duplicates.length === 0) {
      log.info(
        "check-double-dep",
        `  ${colorize("status", "cyan")}  ${colorize("OK", "green")} — no same-version duplicates outside catalog`
      );
      log.info("check-double-dep", "");
      return;
    }

    log.info(
      "check-double-dep",
      `  ${colorize("status", "cyan")}  ${colorize("FOUND", "yellow")} — ${report.duplicates.length} catalog candidates`
    );
    log.info("check-double-dep", "");
    printDuplicates(report.duplicates);

    log.info("check-double-dep", colorize("Next step", "bold"));
    log.info("check-double-dep", colorize("─".repeat(60), "dim"));
    log.info(
      "check-double-dep",
      colorize(
        "  Add candidates to workspaces.catalog in root package.json,",
        "dim"
      )
    );
    log.info(
      "check-double-dep",
      colorize(
        '  then replace versions with "catalog:" in each package.',
        "dim"
      )
    );
    log.info("check-double-dep", "");
  });

const resolveRepoRoot = Effect.gen(function* () {
  const path = yield* Path.Path;
  return path.resolve(import.meta.dirname, "..");
});

if (import.meta.main) {
  initScriptLogging({ script: "check-double-dep" });
  const exitCode = await scriptRuntime.runPromise(
    Effect.gen(function* () {
      const repoRoot = yield* resolveRepoRoot;
      const report = yield* checkDoubleDeps(repoRoot);
      yield* printDoubleDepReport(report);
      return report.duplicates.length === 0 ? 0 : 1;
    })
  );
  process.exit(exitCode);
}
