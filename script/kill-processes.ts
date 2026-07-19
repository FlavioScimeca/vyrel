import { resolve } from "node:path";

const DEV_PORTS = [3000, 3001, 4000, 5555, 6006] as const;

const GLOBAL_PROCESS_PATTERNS = [
  "@biomejs/cli",
  "ultracite",
  "graphql-codegen",
  "turso dev",
  "gql-tada",
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRepoScopedPatterns(repoRoot: string): string[] {
  const root = escapeRegex(repoRoot);

  return [
    `${root}.*node_modules/\\.bin/turbo`,
    `${root}.*turbo run`,
    `${root}.*next dev`,
    `${root}.*next build`,
    `${root}.*concurrently`,
    `${root}.*drizzle-kit`,
    `${root}.*vitest`,
    `${root}.*playwright`,
    `${root}.*\\bwxt\\b`,
    `${root}.*fumadocs-mdx`,
    `${root}.*tsdown`,
    `${root}.*storybook`,
    `${root}.*bun run --hot`,
  ];
}

function runCommand(command: string[]): { status: number; stdout: string } {
  const result = Bun.spawnSync(command, {
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    status: result.exitCode,
    stdout: result.stdout.toString(),
  };
}

function pkillPattern(pattern: string): boolean {
  const result = runCommand(["pkill", "-f", pattern]);
  return result.status === 0;
}

function stopTurboDaemon(): void {
  runCommand(["bunx", "turbo", "daemon", "stop"]);
}

function killPort(port: number): number {
  const lookup = runCommand(["lsof", "-ti", `:${port}`]);

  if (lookup.status !== 0 || lookup.stdout.trim().length === 0) {
    return 0;
  }

  const pids = lookup.stdout
    .trim()
    .split("\n")
    .map((pid) => pid.trim())
    .filter((pid) => pid.length > 0);

  for (const pid of pids) {
    runCommand(["kill", "-9", pid]);
  }

  return pids.length;
}

export interface KillProcessesReport {
  killedPatterns: string[];
  killedPorts: { port: number; pids: number }[];
}

export function killProjectProcesses(repoRoot: string): KillProcessesReport {
  const killedPatterns: string[] = [];
  const killedPorts: KillProcessesReport["killedPorts"] = [];

  stopTurboDaemon();

  for (const pattern of GLOBAL_PROCESS_PATTERNS) {
    if (pkillPattern(pattern)) {
      killedPatterns.push(pattern);
    }
  }

  for (const pattern of buildRepoScopedPatterns(repoRoot)) {
    if (pkillPattern(pattern)) {
      killedPatterns.push(pattern);
    }
  }

  for (const port of DEV_PORTS) {
    const pids = killPort(port);
    if (pids > 0) {
      killedPorts.push({ port, pids });
    }
  }

  return { killedPatterns, killedPorts };
}

function printReport(report: KillProcessesReport): void {
  console.log("Stopped project processes.");

  if (report.killedPatterns.length > 0) {
    console.log(`Matched patterns (${report.killedPatterns.length}):`);
    for (const pattern of report.killedPatterns) {
      console.log(`  - ${pattern}`);
    }
  } else {
    console.log("No matching process patterns were running.");
  }

  if (report.killedPorts.length > 0) {
    console.log("Freed ports:");
    for (const { port, pids } of report.killedPorts) {
      console.log(`  - :${port} (${pids} process${pids === 1 ? "" : "es"})`);
    }
  } else {
    console.log("No listeners found on dev ports.");
  }
}

if (import.meta.main) {
  const repoRoot = resolve(import.meta.dirname, "..");
  const report = killProjectProcesses(repoRoot);
  printReport(report);
}
