import { spawn } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ImageWorkerInput,
  ImageWorkerResponse,
  ImageWorkerRunResult,
  ImageWorkerSuccess,
} from "../workers/image-worker-protocol";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_STDOUT_BYTES = 1024 * 1024;
const DEFAULT_MAX_STDERR_BYTES = 1024 * 1024;
const KILL_GRACE_MS = 500;

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const getImageWorkerPathCandidates = (): string[] => [
  join(process.cwd(), "bin/image-worker"),
  join(process.cwd(), "dist/bin/image-worker"),
  join(moduleDir, "bin/image-worker"),
  join(moduleDir, "../bin/image-worker"),
  join(moduleDir, "../../bin/image-worker"),
  "/var/task/bin/image-worker",
  "/var/task/dist/bin/image-worker",
  "/var/task/apps/server/dist/bin/image-worker",
];

export const resolveImageWorkerPath = (): string | null => {
  for (const candidate of getImageWorkerPathCandidates()) {
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
): { ok: true; result: ImageWorkerSuccess } | { ok: false; error: string } => {
  try {
    const parsed = JSON.parse(stdout) as ImageWorkerResponse;
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

export const runImageWorker = (
  input: ImageWorkerInput,
  options?: {
    timeoutMs?: number;
    maxStdoutBytes?: number;
    maxStderrBytes?: number;
  }
): Promise<ImageWorkerRunResult> => {
  const startedAt = Date.now();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxStdoutBytes = options?.maxStdoutBytes ?? DEFAULT_MAX_STDOUT_BYTES;
  const maxStderrBytes = options?.maxStderrBytes ?? DEFAULT_MAX_STDERR_BYTES;
  const workerPath = resolveImageWorkerPath();

  if (workerPath === null) {
    return Promise.resolve({
      code: "WORKER_NOT_FOUND",
      durationMs: Date.now() - startedAt,
      error: "image-worker binary was not found in any known path.",
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
      error: `image-worker is not executable: ${workerPath}`,
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

    const finish = (result: ImageWorkerRunResult): void => {
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
            : "Failed to spawn image-worker.",
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
        error: `image-worker timed out after ${timeoutMs}ms.`,
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
          error: `image-worker stdout exceeded ${maxStdoutBytes} bytes.`,
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
          error: `image-worker stderr exceeded ${maxStderrBytes} bytes.`,
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
          error: `image-worker exited with code ${exitCode ?? "null"}.`,
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
