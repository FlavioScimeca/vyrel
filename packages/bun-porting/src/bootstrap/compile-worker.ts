import { Command, FileSystem, Path } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import type { PlatformError } from "@effect/platform/Error";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import { Config, Effect, Option, Schema } from "effect";
import type { ConfigError } from "effect/ConfigError";
import type { ParseError } from "effect/ParseResult";

import { BunPortingError } from "../internal/errors";
import { bunPortingRuntime } from "../internal/runtime";
import { getBunPortingConfig, PORTING_WORKER_BINARY_NAME } from "./config";

const WORKER_SIZE_WARNING_BYTES = 80 * 1024 * 1024;

const encodeJson = Schema.encode(Schema.parseJson(Schema.Unknown));
const decodeJson = Schema.decodeUnknown(Schema.parseJson(Schema.Unknown));

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export type CompilePortingWorkerOptions = {
  /** Directory that will contain `bin/porting-worker` (typically apps/server/dist). */
  outdir: string;
  /** Override Bun compiler version (default from configureBunPorting). */
  compilerVersion?: string;
};

type CompileServices = CommandExecutor | FileSystem.FileSystem | Path.Path;

type CompileError = BunPortingError | ConfigError | PlatformError | ParseError;

const determineCompileTargetEffect = (): Effect.Effect<string, ConfigError> =>
  Effect.gen(function* () {
    const vercel = yield* Config.string("VERCEL").pipe(Config.option);

    if (Option.getOrElse(vercel, () => "") === "1") {
      return "bun-linux-x64-baseline";
    }

    if (process.platform === "darwin" && process.arch === "arm64") {
      return "bun-darwin-arm64";
    }

    if (process.platform === "darwin" && process.arch === "x64") {
      return "bun-darwin-x64";
    }

    return "bun-linux-x64-baseline";
  });

export const determineCompileTarget = (): string =>
  Effect.runSync(determineCompileTargetEffect());

const canRunSelfTest = (target: string): boolean => {
  if (process.platform === "darwin" && process.arch === "arm64") {
    return target === "bun-darwin-arm64";
  }

  if (process.platform === "darwin" && process.arch === "x64") {
    return target === "bun-darwin-x64";
  }

  if (process.platform === "linux" && process.arch === "x64") {
    return target === "bun-linux-x64-baseline" || target === "bun-linux-x64";
  }

  return false;
};

const assertCompilerVersion = (
  compilerVersion: string
): Effect.Effect<void, BunPortingError, CommandExecutor> =>
  Effect.gen(function* () {
    const version = yield* Command.string(
      Command.make("bunx", `bun@${compilerVersion}`, "--version")
    ).pipe(
      Effect.mapError(
        (cause) =>
          new BunPortingError({
            cause,
            message: `Failed to resolve bun@${compilerVersion}`,
          })
      )
    );

    const trimmed = version.trim();
    if (!trimmed.startsWith(compilerVersion)) {
      return yield* new BunPortingError({
        message: `Expected bun@${compilerVersion}, received ${trimmed}`,
      });
    }

    log.info("compile-worker", `Using compiler ${trimmed}`);
  });

const compileWithTarget = (
  target: string,
  compilerVersion: string,
  workerEntry: string,
  workerOutfile: string
): Effect.Effect<void, BunPortingError, CommandExecutor> =>
  Effect.gen(function* () {
    const exitCode = yield* Command.exitCode(
      Command.make(
        "bunx",
        `bun@${compilerVersion}`,
        "build",
        "--compile",
        `--target=${target}`,
        workerEntry,
        "--outfile",
        workerOutfile
      ).pipe(Command.stdout("inherit"), Command.stderr("inherit"))
    ).pipe(
      Effect.mapError(
        (cause) =>
          new BunPortingError({
            cause,
            message: `porting-worker compile failed for target ${target}`,
          })
      )
    );

    if (exitCode !== 0) {
      return yield* new BunPortingError({
        message: `porting-worker compile failed for target ${target}`,
      });
    }
  });

const runWorkerSelfTest = (
  workerOutfile: string,
  mode: "diagnostic" | "probe-image",
  input?: Record<string, unknown>
): Effect.Effect<void, BunPortingError | ParseError, CommandExecutor> =>
  Effect.gen(function* () {
    const payload = yield* encodeJson(
      mode === "diagnostic" ? { mode: "diagnostic" } : (input ?? {})
    ).pipe(
      Effect.mapError(
        (cause) =>
          new BunPortingError({
            cause,
            message: `porting-worker self-test (${mode}) failed to encode input`,
          })
      )
    );

    const stdout = yield* Command.string(
      Command.make(workerOutfile).pipe(Command.feed(payload))
    ).pipe(
      Effect.mapError(
        (cause) =>
          new BunPortingError({
            cause,
            message: `porting-worker self-test (${mode}) failed`,
          })
      )
    );

    const parsed = yield* decodeJson(stdout).pipe(
      Effect.mapError(
        (cause) =>
          new BunPortingError({
            cause,
            message: `porting-worker self-test (${mode}) returned invalid JSON: ${stdout}`,
          })
      )
    );

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !("success" in parsed) ||
      parsed.success !== true
    ) {
      return yield* new BunPortingError({
        message: `porting-worker self-test (${mode}) did not succeed: ${stdout}`,
      });
    }

    const { runtime } = parsed as { runtime?: { hasBunImage?: string } };
    if (runtime?.hasBunImage !== "function") {
      return yield* new BunPortingError({
        message: `porting-worker self-test (${mode}) missing Bun.Image: ${stdout}`,
      });
    }
  });

export type CompilePortingWorkerResult = {
  outfile: string;
  sizeBytes: number;
  target: string;
};

const compilePortingWorkerEffect = (
  options: CompilePortingWorkerOptions
): Effect.Effect<CompilePortingWorkerResult, CompileError, CompileServices> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const cfg = getBunPortingConfig();
    const compilerVersion = options.compilerVersion ?? cfg.compilerVersion;

    const packageRoot = path.resolve(import.meta.dirname, "../..");
    const workerEntry = path.join(packageRoot, "src/worker/entry.ts");
    const fixturePath = path.join(packageRoot, "test-fixtures/sample.png");

    const workerOutDir = path.join(options.outdir, "bin");
    const workerOutfile = path.join(workerOutDir, PORTING_WORKER_BINARY_NAME);

    yield* assertCompilerVersion(compilerVersion);
    yield* fs.makeDirectory(workerOutDir, { recursive: true });
    yield* fs.remove(workerOutfile, { force: true });

    const primaryTarget = yield* determineCompileTargetEffect();
    const fallbackTarget =
      primaryTarget === "bun-linux-x64-baseline" ? "bun-linux-x64" : null;
    let compiledTarget = primaryTarget;

    const primaryAttempt = yield* compileWithTarget(
      primaryTarget,
      compilerVersion,
      workerEntry,
      workerOutfile
    ).pipe(Effect.either);

    if (primaryAttempt._tag === "Left") {
      if (fallbackTarget === null) {
        return yield* primaryAttempt.left;
      }

      log.warn(
        "compile-worker",
        `Primary target ${primaryTarget} failed, retrying with ${fallbackTarget}`
      );
      yield* fs.remove(workerOutfile, { force: true });
      yield* compileWithTarget(
        fallbackTarget,
        compilerVersion,
        workerEntry,
        workerOutfile
      );
      compiledTarget = fallbackTarget;
    }

    yield* fs.chmod(workerOutfile, 0o755);

    const workerStat = yield* fs.stat(workerOutfile);
    const sizeBytes = Number(workerStat.size);
    if (sizeBytes === 0) {
      return yield* new BunPortingError({
        message: "porting-worker binary is empty",
      });
    }

    log.info(
      "compile-worker",
      `Built ${workerOutfile} (${formatBytes(sizeBytes)}) target=${compiledTarget}`
    );

    if (sizeBytes > WORKER_SIZE_WARNING_BYTES) {
      log.warn(
        "compile-worker",
        `Warning: porting-worker exceeds ${formatBytes(WORKER_SIZE_WARNING_BYTES)}`
      );
    }

    if (canRunSelfTest(compiledTarget)) {
      yield* runWorkerSelfTest(workerOutfile, "diagnostic");

      const fixtureExists = yield* fs.exists(fixturePath);
      if (fixtureExists) {
        yield* runWorkerSelfTest(workerOutfile, "probe-image", {
          mode: "probe-image",
          source: {
            path: fixturePath,
            type: "path",
          },
        });
        log.info(
          "compile-worker",
          "porting-worker probe-image self-test passed"
        );
      } else {
        log.warn(
          "compile-worker",
          `Skipping probe-image self-test: ${fixturePath} not found`
        );
      }
    } else {
      log.warn(
        "compile-worker",
        `Skipping porting-worker self-test for cross-compiled target ${compiledTarget} on ${process.platform}/${process.arch}`
      );
    }

    return {
      outfile: workerOutfile,
      sizeBytes,
      target: compiledTarget,
    };
  });

export const compilePortingWorker = (
  options: CompilePortingWorkerOptions
): Promise<CompilePortingWorkerResult> => {
  initScriptLogging({ script: "compile-worker" });
  return bunPortingRuntime.runPromise(compilePortingWorkerEffect(options));
};
