import { Command, FileSystem } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import type { PlatformError } from "@effect/platform/Error";
import {
  Clock,
  Duration,
  Effect,
  Either,
  Fiber,
  Ref,
  Schema,
  Stream,
} from "effect";
import type { ParseError } from "effect/ParseResult";

import { getBunPortingConfig } from "../bootstrap/config";
import { BunPortingError } from "./errors";
import type {
  PortingWorkerInput,
  PortingWorkerResponse,
  PortingWorkerRunResult,
  PortingWorkerSuccess,
} from "./protocol";
import { bunPortingRuntime } from "./runtime";

const KILL_GRACE_MS = 500;
const textDecoder = new TextDecoder();
const encodeJson = Schema.encode(Schema.parseJson(Schema.Unknown));
const decodeJson = Schema.decodeUnknown(Schema.parseJson(Schema.Unknown));

export const getPortingWorkerPathCandidates = (): string[] => {
  const { binaryPathCandidates } = getBunPortingConfig();
  return binaryPathCandidates;
};

const resolvePortingWorkerPathEffect = (): Effect.Effect<
  string | null,
  PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    for (const candidate of getPortingWorkerPathCandidates()) {
      if (yield* fs.exists(candidate)) {
        return candidate;
      }
    }

    return null;
  });

export const resolvePortingWorkerPath = (): string | null =>
  bunPortingRuntime.runSync(resolvePortingWorkerPathEffect());

const EXECUTE_BITS = 0o111;

const hasExecutePermission = (mode: number): boolean =>
  // File mode execute bits (owner/group/other) — intentional bitwise check.
  // biome-ignore lint/suspicious/noBitwiseOperators: POSIX execute-bit mask
  (mode & EXECUTE_BITS) !== 0;

const isExecutable = (
  filePath: string
): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const info = yield* fs.stat(filePath).pipe(Effect.option);
    if (info._tag === "None") {
      return false;
    }
    return hasExecutePermission(info.value.mode);
  });

const parseWorkerStdout = (
  stdout: string
): Effect.Effect<
  { ok: true; result: PortingWorkerSuccess } | { ok: false; error: string },
  never
> =>
  decodeJson(stdout).pipe(
    Effect.map((parsed) => {
      const response = parsed as PortingWorkerResponse;
      if (
        response !== null &&
        typeof response === "object" &&
        "success" in response &&
        response.success
      ) {
        return { ok: true as const, result: response };
      }

      if (
        response !== null &&
        typeof response === "object" &&
        "success" in response &&
        !response.success
      ) {
        return { error: response.error, ok: false as const };
      }

      return { error: "Worker stdout is not valid JSON.", ok: false as const };
    }),
    Effect.orElseSucceed(() => ({
      error: "Worker stdout is not valid JSON.",
      ok: false as const,
    }))
  );

type StreamBuffer = {
  text: string;
  bytes: number;
  exceeded: boolean;
};

const collectLimitedStream = (
  stream: Stream.Stream<Uint8Array, PlatformError>,
  maxBytes: number,
  onExceed: Effect.Effect<void>
): Effect.Effect<StreamBuffer> =>
  Effect.gen(function* () {
    const state = yield* Ref.make<StreamBuffer>({
      bytes: 0,
      exceeded: false,
      text: "",
    });

    yield* Stream.runForEach(stream, (chunk) =>
      Effect.gen(function* () {
        const current = yield* Ref.get(state);
        if (current.exceeded) {
          return;
        }

        const nextBytes = current.bytes + chunk.byteLength;
        if (nextBytes > maxBytes) {
          yield* Ref.set(state, { ...current, exceeded: true });
          yield* onExceed;
          return;
        }

        yield* Ref.set(state, {
          bytes: nextBytes,
          exceeded: false,
          text: current.text + textDecoder.decode(chunk),
        });
      })
    ).pipe(Effect.ignore);

    return yield* Ref.get(state);
  });

type FailureOutcome =
  | { _tag: "limit"; which: "stdout" | "stderr" }
  | { _tag: "timeout" };

const runWorkerProcess = (
  workerPath: string,
  input: PortingWorkerInput,
  timeoutMs: number,
  maxStdoutBytes: number,
  maxStderrBytes: number,
  startedAt: number
): Effect.Effect<
  PortingWorkerRunResult,
  BunPortingError | ParseError,
  CommandExecutor | Clock.Clock
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const clock = yield* Clock.Clock;
      const elapsed = () =>
        clock.currentTimeMillis.pipe(Effect.map((now) => now - startedAt));

      const payload = yield* encodeJson(input).pipe(
        Effect.mapError(
          (cause) =>
            new BunPortingError({
              cause,
              message: "Failed to encode porting-worker input.",
            })
        )
      );

      const started = yield* Command.start(
        Command.make(workerPath).pipe(Command.feed(payload))
      ).pipe(Effect.either);

      if (Either.isLeft(started)) {
        return {
          code: "WORKER_SPAWN_FAILED" as const,
          durationMs: yield* elapsed(),
          error:
            started.left instanceof Error
              ? started.left.message
              : "Failed to spawn porting-worker.",
          exitCode: null,
          ok: false as const,
          path: workerPath,
          stderr: "",
          stdout: "",
        };
      }

      const process = started.right;
      const outcomeRef = yield* Ref.make<FailureOutcome | null>(null);

      const killWithGrace = Effect.gen(function* () {
        yield* process.kill("SIGTERM").pipe(Effect.ignore);
        yield* Effect.sleep(Duration.millis(KILL_GRACE_MS));
        const running = yield* process.isRunning.pipe(
          Effect.orElseSucceed(() => false)
        );
        if (running) {
          yield* process.kill("SIGKILL").pipe(Effect.ignore);
        }
      });

      const markLimit = (which: "stdout" | "stderr") =>
        Effect.gen(function* () {
          const current = yield* Ref.get(outcomeRef);
          if (current !== null) {
            return;
          }
          yield* Ref.set(outcomeRef, { _tag: "limit", which });
          yield* killWithGrace;
        });

      const stdoutFiber = yield* Effect.forkScoped(
        collectLimitedStream(
          process.stdout,
          maxStdoutBytes,
          markLimit("stdout")
        )
      );
      const stderrFiber = yield* Effect.forkScoped(
        collectLimitedStream(
          process.stderr,
          maxStderrBytes,
          markLimit("stderr")
        )
      );

      const exitFiber = yield* Effect.forkScoped(
        process.exitCode.pipe(
          Effect.timeout(Duration.millis(timeoutMs)),
          Effect.matchEffect({
            onFailure: () =>
              Effect.gen(function* () {
                const current = yield* Ref.get(outcomeRef);
                if (current === null) {
                  yield* Ref.set(outcomeRef, { _tag: "timeout" });
                  yield* killWithGrace;
                }
                return null as number | null;
              }),
            onSuccess: (code) => Effect.succeed(Number(code)),
          })
        )
      );

      const exitCode = yield* Fiber.join(exitFiber);
      const stdoutState = yield* Fiber.join(stdoutFiber);
      const stderrState = yield* Fiber.join(stderrFiber);
      const outcome = yield* Ref.get(outcomeRef);
      const durationMs = yield* elapsed();

      if (outcome?._tag === "timeout") {
        return {
          code: "WORKER_TIMEOUT" as const,
          durationMs,
          error: `porting-worker timed out after ${timeoutMs}ms.`,
          exitCode: null,
          ok: false as const,
          path: workerPath,
          stderr: stderrState.text,
          stdout: stdoutState.text,
        };
      }

      if (outcome?._tag === "limit" && outcome.which === "stdout") {
        return {
          code: "WORKER_STDOUT_LIMIT" as const,
          durationMs,
          error: `porting-worker stdout exceeded ${maxStdoutBytes} bytes.`,
          exitCode: null,
          ok: false as const,
          path: workerPath,
          stderr: stderrState.text,
          stdout: stdoutState.text,
        };
      }

      if (outcome?._tag === "limit" && outcome.which === "stderr") {
        return {
          code: "WORKER_STDERR_LIMIT" as const,
          durationMs,
          error: `porting-worker stderr exceeded ${maxStderrBytes} bytes.`,
          exitCode: null,
          ok: false as const,
          path: workerPath,
          stderr: stderrState.text,
          stdout: stdoutState.text,
        };
      }

      if (exitCode !== 0) {
        return {
          code: "WORKER_EXIT_NON_ZERO" as const,
          durationMs,
          error: `porting-worker exited with code ${exitCode ?? "null"}.`,
          exitCode,
          ok: false as const,
          path: workerPath,
          stderr: stderrState.text,
          stdout: stdoutState.text,
        };
      }

      const parsed = yield* parseWorkerStdout(stdoutState.text.trim());
      if (!parsed.ok) {
        return {
          code: "WORKER_INVALID_JSON" as const,
          durationMs,
          error: parsed.error,
          exitCode: 0,
          ok: false as const,
          path: workerPath,
          stderr: stderrState.text,
          stdout: stdoutState.text,
        };
      }

      return {
        durationMs,
        exitCode: 0 as const,
        ok: true as const,
        path: workerPath,
        result: parsed.result,
        stderr: stderrState.text,
      };
    })
  );

export const runPortingWorkerEffect = (
  input: PortingWorkerInput,
  options?: {
    timeoutMs?: number;
    maxStdoutBytes?: number;
    maxStderrBytes?: number;
  }
): Effect.Effect<
  PortingWorkerRunResult,
  BunPortingError | ParseError,
  FileSystem.FileSystem | CommandExecutor | Clock.Clock
> =>
  Effect.gen(function* () {
    const clock = yield* Clock.Clock;
    const startedAt = yield* clock.currentTimeMillis;
    const cfg = getBunPortingConfig();
    const timeoutMs = options?.timeoutMs ?? cfg.timeoutMs;
    const maxStdoutBytes = options?.maxStdoutBytes ?? cfg.maxStdoutBytes;
    const maxStderrBytes = options?.maxStderrBytes ?? cfg.maxStderrBytes;

    const workerPath = yield* resolvePortingWorkerPathEffect().pipe(
      Effect.orElseSucceed(() => null)
    );

    if (workerPath === null) {
      return {
        code: "WORKER_NOT_FOUND" as const,
        durationMs: (yield* clock.currentTimeMillis) - startedAt,
        error: "porting-worker binary was not found in any known path.",
        exitCode: null,
        ok: false as const,
        path: null,
        stderr: "",
        stdout: "",
      };
    }

    if (!(yield* isExecutable(workerPath))) {
      return {
        code: "WORKER_NOT_EXECUTABLE" as const,
        durationMs: (yield* clock.currentTimeMillis) - startedAt,
        error: `porting-worker is not executable: ${workerPath}`,
        exitCode: null,
        ok: false as const,
        path: workerPath,
        stderr: "",
        stdout: "",
      };
    }

    return yield* runWorkerProcess(
      workerPath,
      input,
      timeoutMs,
      maxStdoutBytes,
      maxStderrBytes,
      startedAt
    );
  });

export const runPortingWorker = (
  input: PortingWorkerInput,
  options?: {
    timeoutMs?: number;
    maxStdoutBytes?: number;
    maxStderrBytes?: number;
  }
): Promise<PortingWorkerRunResult> =>
  bunPortingRuntime.runPromise(runPortingWorkerEffect(input, options));
