import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Workspaces that extend the root tsconfig (includes @effect/language-service plugin).
 * `tsc --noEmit` does not run these rules unless TypeScript is patched — use this CLI instead.
 */
export const EFFECT_PROJECTS = ["packages/api/tsconfig.json"] as const;

export interface EffectProjectResult {
  exitCode: number;
  project: string;
  skipped: boolean;
}

export interface EffectCheckReport {
  results: EffectProjectResult[];
  root: string;
}

export function runEffectDiagnostics(
  repoRoot: string,
  project: string
): Promise<number> {
  const proc = Bun.spawn(
    [
      "bunx",
      "effect-language-service",
      "diagnostics",
      "--project",
      project,
      "--format",
      "text",
    ],
    {
      cwd: repoRoot,
      stdio: ["inherit", "inherit", "inherit"],
    }
  );

  return proc.exited;
}

export async function checkEffectProjects(
  repoRoot: string,
  projects: readonly string[] = EFFECT_PROJECTS
): Promise<EffectCheckReport> {
  const root = resolve(repoRoot);
  const results: EffectProjectResult[] = [];

  console.log("Effect language service (@effect/language-service) diagnostics");

  for (const project of projects) {
    const projectPath = resolve(root, project);

    if (!existsSync(projectPath)) {
      console.log(`Skipping missing project: ${project}`);
      results.push({ exitCode: 0, project, skipped: true });
      continue;
    }

    console.log("");
    console.log(`==> ${project}`);

    // biome-ignore lint/performance/noAwaitInLoops: runs sequentially to short-circuit on the first failing project
    const exitCode = await runEffectDiagnostics(root, project);
    results.push({ exitCode, project, skipped: false });

    if (exitCode !== 0) {
      break;
    }
  }

  return { results, root };
}

function resolveRepoRoot(): string {
  return resolve(import.meta.dirname, "..");
}

function getFailedResult(
  report: EffectCheckReport
): EffectProjectResult | undefined {
  return report.results.find(
    (result) => !result.skipped && result.exitCode !== 0
  );
}

if (import.meta.main) {
  const report = await checkEffectProjects(resolveRepoRoot());
  const failed = getFailedResult(report);

  if (failed) {
    process.exit(failed.exitCode);
  }

  console.log("");
  console.log("Effect language service checks passed.");
}
