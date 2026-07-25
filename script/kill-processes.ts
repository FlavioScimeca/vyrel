import { Path } from "@effect/platform";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import { Effect } from "effect";
import { scriptRuntime } from "./runtime";

const DEV_PORTS = [3000, 3001, 4000, 5555, 6006] as const;

const GLOBAL_PROCESS_PATTERNS = [
  "@biomejs/cli",
  "ultracite",
  "graphql-codegen",
  "turso dev",
  "gql-tada",
] as const;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRepoScopedPatterns = (repoRoot: string): string[] => {
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
};

const runCommand = (
  command: string[]
): Effect.Effect<{ status: number; stdout: string }> =>
  Effect.sync(() => {
    const result = Bun.spawnSync(command, {
      stderr: "pipe",
      stdout: "pipe",
    });

    return {
      status: result.exitCode,
      stdout: result.stdout.toString(),
    };
  });

const pkillPattern = (pattern: string): Effect.Effect<boolean> =>
  runCommand(["pkill", "-f", pattern]).pipe(
    Effect.map((result) => result.status === 0)
  );

const stopTurboDaemon = (): Effect.Effect<void> =>
  runCommand(["bunx", "turbo", "daemon", "stop"]).pipe(Effect.asVoid);

const killPort = (port: number): Effect.Effect<number> =>
  Effect.gen(function* () {
    const lookup = yield* runCommand(["lsof", "-ti", `:${port}`]);

    if (lookup.status !== 0 || lookup.stdout.trim().length === 0) {
      return 0;
    }

    const pids = lookup.stdout
      .trim()
      .split("\n")
      .map((pid) => pid.trim())
      .filter((pid) => pid.length > 0);

    for (const pid of pids) {
      yield* runCommand(["kill", "-9", pid]);
    }

    return pids.length;
  });

export interface KillProcessesReport {
  killedPatterns: string[];
  killedPorts: { port: number; pids: number }[];
}

export const killProjectProcesses = (
  repoRoot: string
): Effect.Effect<KillProcessesReport> =>
  Effect.gen(function* () {
    const killedPatterns: string[] = [];
    const killedPorts: KillProcessesReport["killedPorts"] = [];

    yield* stopTurboDaemon();

    for (const pattern of GLOBAL_PROCESS_PATTERNS) {
      if (yield* pkillPattern(pattern)) {
        killedPatterns.push(pattern);
      }
    }

    for (const pattern of buildRepoScopedPatterns(repoRoot)) {
      if (yield* pkillPattern(pattern)) {
        killedPatterns.push(pattern);
      }
    }

    for (const port of DEV_PORTS) {
      const pids = yield* killPort(port);
      if (pids > 0) {
        killedPorts.push({ port, pids });
      }
    }

    return { killedPatterns, killedPorts };
  });

export const printKillProcessesReport = (
  report: KillProcessesReport
): Effect.Effect<void> =>
  Effect.sync(() => {
    log.info("kill-processes", "Stopped project processes.");

    if (report.killedPatterns.length > 0) {
      log.info(
        "kill-processes",
        `Matched patterns (${report.killedPatterns.length}):`
      );
      for (const pattern of report.killedPatterns) {
        log.info("kill-processes", `  - ${pattern}`);
      }
    } else {
      log.info("kill-processes", "No matching process patterns were running.");
    }

    if (report.killedPorts.length > 0) {
      log.info("kill-processes", "Freed ports:");
      for (const { port, pids } of report.killedPorts) {
        log.info(
          "kill-processes",
          `  - :${port} (${pids} process${pids === 1 ? "" : "es"})`
        );
      }
    } else {
      log.info("kill-processes", "No listeners found on dev ports.");
    }
  });

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const report = yield* killProjectProcesses(repoRoot);
  yield* printKillProcessesReport(report);
});

if (import.meta.main) {
  initScriptLogging({ script: "kill-processes" });
  await scriptRuntime.runPromise(program);
}
