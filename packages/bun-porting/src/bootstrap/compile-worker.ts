import { chmod, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getBunPortingConfig, PORTING_WORKER_BINARY_NAME } from "./config";

// Worker size warning threshold is set to 80 MB
const WORKER_SIZE_WARNING_BYTES = 80 * 1024 * 1024;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const workerEntry = join(packageRoot, "src/worker/entry.ts");
const fixturePath = join(packageRoot, "test-fixtures/sample.png");

export type CompilePortingWorkerOptions = {
  /** Directory that will contain `bin/porting-worker` (typically apps/server/dist). */
  outdir: string;
  /** Override Bun compiler version (default from configureBunPorting). */
  compilerVersion?: string;
};

export const determineCompileTarget = (): string => {
  if (process.env.VERCEL === "1") {
    return "bun-linux-x64-baseline";
  }

  if (process.platform === "darwin" && process.arch === "arm64") {
    return "bun-darwin-arm64";
  }

  if (process.platform === "darwin" && process.arch === "x64") {
    return "bun-darwin-x64";
  }

  return "bun-linux-x64-baseline";
};

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

const assertCompilerVersion = (compilerVersion: string): void => {
  const result = Bun.spawnSync({
    cmd: ["bunx", `bun@${compilerVersion}`, "--version"],
    stderr: "pipe",
    stdout: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to resolve bun@${compilerVersion}: ${result.stderr.toString()}`
    );
  }

  const version = result.stdout.toString().trim();
  if (!version.startsWith(compilerVersion)) {
    throw new Error(`Expected bun@${compilerVersion}, received ${version}`);
  }

  console.log(`Using compiler ${version}`);
};

const compileWithTarget = (
  target: string,
  compilerVersion: string,
  workerOutfile: string
): void => {
  const result = Bun.spawnSync({
    cmd: [
      "bunx",
      `bun@${compilerVersion}`,
      "build",
      "--compile",
      `--target=${target}`,
      workerEntry,
      "--outfile",
      workerOutfile,
    ],
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`porting-worker compile failed for target ${target}`);
  }
};

const runWorkerSelfTest = async (
  workerOutfile: string,
  mode: "diagnostic" | "probe-image",
  input?: Record<string, unknown>
): Promise<void> => {
  const payload =
    mode === "diagnostic"
      ? JSON.stringify({ mode: "diagnostic" })
      : JSON.stringify(input);

  const child = Bun.spawn({
    cmd: [workerOutfile],
    stderr: "pipe",
    stdin: "pipe",
    stdout: "pipe",
  });

  child.stdin.write(payload);
  child.stdin.end();

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `porting-worker self-test (${mode}) failed with exit ${exitCode}: ${stderr || stdout}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `porting-worker self-test (${mode}) returned invalid JSON: ${stdout}`,
      { cause: error }
    );
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("success" in parsed) ||
    parsed.success !== true
  ) {
    throw new Error(
      `porting-worker self-test (${mode}) did not succeed: ${stdout}`
    );
  }

  const { runtime } = parsed as { runtime?: { hasBunImage?: string } };
  if (runtime?.hasBunImage !== "function") {
    throw new Error(
      `porting-worker self-test (${mode}) missing Bun.Image: ${stdout}`
    );
  }
};

export const compilePortingWorker = async (
  options: CompilePortingWorkerOptions
): Promise<{
  outfile: string;
  sizeBytes: number;
  target: string;
}> => {
  const cfg = getBunPortingConfig();
  const compilerVersion = options.compilerVersion ?? cfg.compilerVersion;

  const workerOutDir = join(options.outdir, "bin");
  const workerOutfile = join(workerOutDir, PORTING_WORKER_BINARY_NAME);

  assertCompilerVersion(compilerVersion);
  await mkdir(workerOutDir, { recursive: true });
  await rm(workerOutfile, { force: true });

  const primaryTarget = determineCompileTarget();
  const fallbackTarget =
    primaryTarget === "bun-linux-x64-baseline" ? "bun-linux-x64" : null;
  let compiledTarget = primaryTarget;

  try {
    compileWithTarget(primaryTarget, compilerVersion, workerOutfile);
  } catch (primaryError) {
    if (fallbackTarget === null) {
      throw primaryError;
    }

    console.warn(
      `Primary target ${primaryTarget} failed, retrying with ${fallbackTarget}`
    );
    await rm(workerOutfile, { force: true });
    compileWithTarget(fallbackTarget, compilerVersion, workerOutfile);
    compiledTarget = fallbackTarget;
  }

  await chmod(workerOutfile, 0o755);

  const workerStat = await stat(workerOutfile);
  if (workerStat.size === 0) {
    throw new Error("porting-worker binary is empty");
  }

  console.log(
    `Built ${workerOutfile} (${formatBytes(workerStat.size)}) target=${compiledTarget}`
  );

  if (workerStat.size > WORKER_SIZE_WARNING_BYTES) {
    console.warn(
      `Warning: porting-worker exceeds ${formatBytes(WORKER_SIZE_WARNING_BYTES)}`
    );
  }

  if (canRunSelfTest(compiledTarget)) {
    await runWorkerSelfTest(workerOutfile, "diagnostic");

    const fixtureExists = await Bun.file(fixturePath).exists();
    if (fixtureExists) {
      await runWorkerSelfTest(workerOutfile, "probe-image", {
        mode: "probe-image",
        source: {
          path: fixturePath,
          type: "path",
        },
      });
      console.log("porting-worker probe-image self-test passed");
    } else {
      console.warn(`Skipping probe-image self-test: ${fixturePath} not found`);
    }
  } else {
    console.warn(
      `Skipping porting-worker self-test for cross-compiled target ${compiledTarget} on ${process.platform}/${process.arch}`
    );
  }

  return {
    outfile: workerOutfile,
    sizeBytes: workerStat.size,
    target: compiledTarget,
  };
};
