import { spawn } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";

import { getBunPortingConfig } from "../bootstrap/config";
import type {
  PortingWorkerInput,
  PortingWorkerResponse,
  PortingWorkerRunResult,
  PortingWorkerSuccess,
} from "./protocol";

const KILL_GRACE_MS = 500;

export const getPortingWorkerPathCandidates = (): string[] => {
  const { binaryPathCandidates } = getBunPortingConfig();
  return binaryPathCandidates;
};

export const resolvePortingWorkerPath = (): string | null => {
  for (const candidate of getPortingWorkerPathCandidates()) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const isExecutable = (path: string): boolean => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const parseWorkerStdout = (
  stdout: string
):
  | { ok: true; result: PortingWorkerSuccess }
  | { ok: false; error: string } => {
  try {
    const parsed = JSON.parse(stdout) as PortingWorkerResponse;
    if (parsed.success) {
      return { ok: true, result: parsed };
    }

    return {
      error: parsed.error,
      ok: false,
    };
  } catch {
    return {
      error: "Worker stdout is not valid JSON.",
      ok: false,
    };
  }
};

export const runPortingWorker = (
  input: PortingWorkerInput,
  options?: {
    timeoutMs?: number;
    maxStdoutBytes?: number;
    maxStderrBytes?: number;
  }
): Promise<PortingWorkerRunResult> => {
  const startedAt = Date.now();
  const cfg = getBunPortingConfig();
  const timeoutMs = options?.timeoutMs ?? cfg.timeoutMs;
  const maxStdoutBytes = options?.maxStdoutBytes ?? cfg.maxStdoutBytes;
  const maxStderrBytes = options?.maxStderrBytes ?? cfg.maxStderrBytes;
  const workerPath = resolvePortingWorkerPath();

  if (workerPath === null) {
    return Promise.resolve({
      code: "WORKER_NOT_FOUND",
      durationMs: Date.now() - startedAt,
      error: "porting-worker binary was not found in any known path.",
      exitCode: null,
      ok: false,
      path: null,
      stderr: "",
      stdout: "",
    });
  }

  if (!isExecutable(workerPath)) {
    return Promise.resolve({
      code: "WORKER_NOT_EXECUTABLE",
      durationMs: Date.now() - startedAt,
      error: `porting-worker is not executable: ${workerPath}`,
      exitCode: null,
      ok: false,
      path: workerPath,
      stderr: "",
      stdout: "",
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdout = "";
    let stderr = "";
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: PortingWorkerRunResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutTimer !== null) {
        clearTimeout(timeoutTimer);
      }
      if (killTimer !== null) {
        clearTimeout(killTimer);
      }
      resolve(result);
    };

    const child = spawn(workerPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.on("error", (cause) => {
      finish({
        code: "WORKER_SPAWN_FAILED",
        durationMs: Date.now() - startedAt,
        error:
          cause instanceof Error
            ? cause.message
            : "Failed to spawn porting-worker.",
        exitCode: null,
        ok: false,
        path: workerPath,
        stderr,
        stdout,
      });
    });

    const terminateChild = (signal: NodeJS.Signals): void => {
      if (child.killed) {
        return;
      }

      child.kill(signal);
      if (signal === "SIGTERM") {
        killTimer = setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, KILL_GRACE_MS);
      }
    };

    timeoutTimer = setTimeout(() => {
      terminateChild("SIGTERM");
      finish({
        code: "WORKER_TIMEOUT",
        durationMs: Date.now() - startedAt,
        error: `porting-worker timed out after ${timeoutMs}ms.`,
        exitCode: null,
        ok: false,
        path: workerPath,
        stderr,
        stdout,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > maxStdoutBytes) {
        terminateChild("SIGTERM");
        finish({
          code: "WORKER_STDOUT_LIMIT",
          durationMs: Date.now() - startedAt,
          error: `porting-worker stdout exceeded ${maxStdoutBytes} bytes.`,
          exitCode: null,
          ok: false,
          path: workerPath,
          stderr,
          stdout,
        });
        return;
      }

      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > maxStderrBytes) {
        terminateChild("SIGTERM");
        finish({
          code: "WORKER_STDERR_LIMIT",
          durationMs: Date.now() - startedAt,
          error: `porting-worker stderr exceeded ${maxStderrBytes} bytes.`,
          exitCode: null,
          ok: false,
          path: workerPath,
          stderr,
          stdout,
        });
      } else {
        stderr += chunk.toString("utf8");
      }
    });

    child.on("close", (exitCode) => {
      const durationMs = Date.now() - startedAt;

      if (exitCode !== 0) {
        finish({
          code: "WORKER_EXIT_NON_ZERO",
          durationMs,
          error: `porting-worker exited with code ${exitCode ?? "null"}.`,
          exitCode,
          ok: false,
          path: workerPath,
          stderr,
          stdout,
        });
        return;
      }

      const parsed = parseWorkerStdout(stdout.trim());
      if (!parsed.ok) {
        finish({
          code: "WORKER_INVALID_JSON",
          durationMs,
          error: parsed.error,
          exitCode: 0,
          ok: false,
          path: workerPath,
          stderr,
          stdout,
        });
        return;
      }

      finish({
        durationMs,
        exitCode: 0,
        ok: true,
        path: workerPath,
        result: parsed.result,
        stderr,
      });
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
};
