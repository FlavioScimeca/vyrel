import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import { Effect } from "effect";
import { scriptRuntime } from "./runtime";

const PATCH_TARGETS = [
  "node_modules/@typescript-eslint",
  "node_modules/@effect/language-service",
  "node_modules/@gql.tada",
  "node_modules/ts-api-utils",
  "node_modules/@expo/require-utils",
] as const;

const PATCHED_EXTENSIONS = new Set([".js", ".cjs", ".mjs"]);

const REPLACEMENTS: readonly [RegExp, string][] = [
  [/require\.resolve\("typescript"/g, 'require.resolve("typescript6"'],
  [/require\.resolve\('typescript'/g, "require.resolve('typescript6'"],
  [/require\("typescript\//g, 'require("typescript6/'],
  [/require\('typescript\//g, "require('typescript6/"],
  [/require\("typescript"\)/g, 'require("typescript6")'],
  [/require\('typescript'\)/g, "require('typescript6')"],
  [/from "typescript"/g, 'from "typescript6"'],
  [/from 'typescript'/g, "from 'typescript6'"],
  [/"\/node_modules\/typescript"/g, '"/node_modules/typescript6"'],
  [/'\/node_modules\/typescript'/g, "'/node_modules/typescript6'"],
  [/\.\/node_modules\/typescript"/g, './node_modules/typescript6"'],
  [/\.\/node_modules\/typescript'/g, "./node_modules/typescript6'"],
];

export interface PatchReport {
  filesPatched: number;
  replacements: number;
  skipped: boolean;
  skipReason?: string;
}

const collectFiles = (
  fs: FileSystem.FileSystem,
  pathApi: Path.Path,
  directory: string,
  files: string[]
): Effect.Effect<void, PlatformError> =>
  Effect.gen(function* () {
    if (!(yield* fs.exists(directory))) {
      return;
    }

    const entries = yield* fs.readDirectory(directory);

    for (const entry of entries) {
      const entryPath = pathApi.join(directory, entry);
      const stat = yield* fs.stat(entryPath);

      if (stat.type === "Directory") {
        yield* collectFiles(fs, pathApi, entryPath, files);
        continue;
      }

      const extension = entry.slice(entry.lastIndexOf("."));
      if (PATCHED_EXTENSIONS.has(extension)) {
        files.push(entryPath);
      }
    }
  });

export const patchTypeScriptImports = (
  root?: string
): Effect.Effect<
  PatchReport,
  PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const pathApi = yield* Path.Path;
    const resolvedRoot =
      root ?? pathApi.resolve(pathApi.join(import.meta.dirname, ".."));

    const typescript6Path = pathApi.join(
      resolvedRoot,
      "node_modules/typescript6/package.json"
    );

    if (!(yield* fs.exists(typescript6Path))) {
      return {
        filesPatched: 0,
        replacements: 0,
        skipped: true,
        skipReason: "typescript6 is not installed",
      };
    }

    const files: string[] = [];
    for (const target of PATCH_TARGETS) {
      yield* collectFiles(
        fs,
        pathApi,
        pathApi.join(resolvedRoot, target),
        files
      );
    }

    let filesPatched = 0;
    let replacements = 0;

    for (const file of files) {
      const original = yield* fs.readFileString(file);
      let next = original;

      for (const [pattern, replacement] of REPLACEMENTS) {
        const matches = next.match(pattern);
        if (matches !== null) {
          replacements += matches.length;
          next = next.replace(pattern, replacement);
        }
      }

      if (next !== original) {
        yield* fs.writeFileString(file, next);
        filesPatched += 1;
      }
    }

    return {
      filesPatched,
      replacements,
      skipped: false,
    };
  });

const program = Effect.gen(function* () {
  const report = yield* patchTypeScriptImports();

  if (report.skipped) {
    log.info(
      "patch-ts6-imports",
      `patch-ts6-imports: skipped (${report.skipReason})`
    );
    return;
  }

  log.info(
    "patch-ts6-imports",
    `patch-ts6-imports: rewired ${report.replacements} import(s) across ${report.filesPatched} file(s) to typescript6`
  );
});

if (import.meta.main) {
  initScriptLogging({ script: "patch-ts6-imports" });
  await scriptRuntime.runPromise(program);
}
