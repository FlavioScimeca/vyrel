import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(join(fileURLToPath(import.meta.url), "..", ".."));

const PATCH_TARGETS = [
  "node_modules/@typescript-eslint",
  "node_modules/@effect/language-service",
  "node_modules/ts-api-utils",
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

function collectFiles(directory: string, files: string[]): void {
  if (!existsSync(directory)) {
    return;
  }

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      collectFiles(path, files);
      continue;
    }

    const extension = entry.slice(entry.lastIndexOf("."));
    if (PATCHED_EXTENSIONS.has(extension)) {
      files.push(path);
    }
  }
}

export function patchTypeScriptImports(root = repoRoot): PatchReport {
  const typescript6Path = join(root, "node_modules/typescript6/package.json");
  if (!existsSync(typescript6Path)) {
    return {
      filesPatched: 0,
      replacements: 0,
      skipped: true,
      skipReason: "typescript6 is not installed",
    };
  }

  const files: string[] = [];
  for (const target of PATCH_TARGETS) {
    collectFiles(join(root, target), files);
  }

  let filesPatched = 0;
  let replacements = 0;

  for (const file of files) {
    const original = readFileSync(file, "utf8");
    let next = original;

    for (const [pattern, replacement] of REPLACEMENTS) {
      const matches = next.match(pattern);
      if (matches) {
        replacements += matches.length;
        next = next.replace(pattern, replacement);
      }
    }

    if (next !== original) {
      writeFileSync(file, next);
      filesPatched += 1;
    }
  }

  return {
    filesPatched,
    replacements,
    skipped: false,
  };
}

function main(): void {
  const report = patchTypeScriptImports();

  if (report.skipped) {
    console.log(`patch-ts6-imports: skipped (${report.skipReason})`);
    return;
  }

  console.log(
    `patch-ts6-imports: rewired ${report.replacements} import(s) across ${report.filesPatched} file(s) to typescript6`
  );
}

if (import.meta.main) {
  main();
}
