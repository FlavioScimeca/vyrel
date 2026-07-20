import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Schema } from "effect";
import type { ParseError } from "effect/ParseResult";
import { scriptRuntime } from "./runtime";

const ROOT_TSCONFIG = "tsconfig.json";

const tsconfigSchema = Schema.Struct({
  extends: Schema.optional(Schema.String),
});

const parseTsconfig = Schema.decodeUnknown(Schema.parseJson(tsconfigSchema));

/**
 * Packages whose tsconfig extends the repo root (inherits @effect/language-service).
 * Discovered automatically so new Effect packages are included without manual updates.
 */
export const discoverEffectProjects = (
  repoRoot: string
): Effect.Effect<
  string[],
  PlatformError | ParseError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const rootConfigPath = path.resolve(repoRoot, ROOT_TSCONFIG);
    const packagesDir = path.join(repoRoot, "packages");
    const projects: string[] = [];

    const inspectTsconfig = (tsconfigPath: string) =>
      Effect.gen(function* () {
        const content = yield* fs.readFileString(tsconfigPath);
        const config = yield* parseTsconfig(content);

        if (config.extends === undefined) {
          return;
        }

        const extendedPath = path.resolve(
          path.dirname(tsconfigPath),
          config.extends
        );
        if (extendedPath === rootConfigPath) {
          projects.push(path.relative(repoRoot, tsconfigPath));
        }
      });

    const walk = (
      directory: string
    ): Effect.Effect<
      void,
      PlatformError | ParseError,
      FileSystem.FileSystem | Path.Path
    > =>
      Effect.gen(function* () {
        if (!(yield* fs.exists(directory))) {
          return;
        }

        const entries = yield* fs.readDirectory(directory);

        for (const entry of entries) {
          const packageDir = path.join(directory, entry);
          const entryInfo = yield* fs.stat(packageDir);

          if (entryInfo.type !== "Directory") {
            continue;
          }

          const tsconfigPath = path.join(packageDir, ROOT_TSCONFIG);

          if (yield* fs.exists(tsconfigPath)) {
            yield* inspectTsconfig(tsconfigPath);
          } else {
            yield* walk(packageDir);
          }
        }
      });

    yield* walk(packagesDir);

    return projects.toSorted((a, b) => a.localeCompare(b));
  });

export interface EffectProjectResult {
  exitCode: number;
  project: string;
  skipped: boolean;
}

export interface EffectCheckReport {
  results: EffectProjectResult[];
  root: string;
}

export const runEffectDiagnosticsWithTurbo = (
  repoRoot: string
): Effect.Effect<number> =>
  Effect.promise(() => {
    const proc = Bun.spawn(["bunx", "turbo", "check-effect-ts"], {
      cwd: repoRoot,
      stdio: ["inherit", "inherit", "inherit"],
    });

    return proc.exited;
  });

export const checkEffectProjectsEffect = (
  repoRoot: string
): Effect.Effect<EffectCheckReport, never, Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const root = path.resolve(repoRoot);

    yield* Effect.log(
      "Effect language service (@effect/language-service) diagnostics"
    );

    const exitCode = yield* runEffectDiagnosticsWithTurbo(root);

    return {
      results: [{ exitCode, project: "turbo check-effect-ts", skipped: false }],
      root,
    };
  });

export function checkEffectProjects(
  repoRoot: string
): Promise<EffectCheckReport> {
  return scriptRuntime.runPromise(checkEffectProjectsEffect(repoRoot));
}

const getFailedResult = (
  report: EffectCheckReport
): EffectProjectResult | undefined =>
  report.results.find((result) => !result.skipped && result.exitCode !== 0);

const main = Effect.gen(function* () {
  const path = yield* Path.Path;
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const report = yield* checkEffectProjectsEffect(repoRoot);
  const failed = getFailedResult(report);

  if (failed !== undefined) {
    return failed.exitCode;
  }

  yield* Effect.log("");
  yield* Effect.log("Effect language service checks passed.");
  return 0;
});

if (import.meta.main) {
  const exitCode = await scriptRuntime.runPromise(main);
  process.exit(exitCode);
}
