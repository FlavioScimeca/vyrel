import { chmod, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUN_COMPILER_VERSION = "1.3.14";
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

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerEntry = join(packageRoot, "src/workers/image-worker.ts");
const workerOutDir = join(packageRoot, "dist/bin");
const workerOutfile = join(workerOutDir, "image-worker");
const fixturePath = join(packageRoot, "test-fixtures/sample.png");

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

const assertCompilerVersion = (): void => {
  const result = Bun.spawnSync({
    cmd: ["bunx", `bun@${BUN_COMPILER_VERSION}`, "--version"],
    stderr: "pipe",
    stdout: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to resolve bun@${BUN_COMPILER_VERSION}: ${result.stderr.toString()}`
    );
  }

  const version = result.stdout.toString().trim();
  if (!version.startsWith(BUN_COMPILER_VERSION)) {
    throw new Error(
      `Expected bun@${BUN_COMPILER_VERSION}, received ${version}`
    );
  }

  console.log(`Using compiler ${version}`);
};

const compileWithTarget = (target: string): void => {
  const result = Bun.spawnSync({
    cmd: [
      "bunx",
      `bun@${BUN_COMPILER_VERSION}`,
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
    throw new Error(`image-worker compile failed for target ${target}`);
  }
};

const runWorkerSelfTest = async (
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
      `image-worker self-test (${mode}) failed with exit ${exitCode}: ${stderr || stdout}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `image-worker self-test (${mode}) returned invalid JSON: ${stdout}`,
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
      `image-worker self-test (${mode}) did not succeed: ${stdout}`
    );
  }

  const { runtime } = parsed as { runtime?: { hasBunImage?: string } };
  if (runtime?.hasBunImage !== "function") {
    throw new Error(
      `image-worker self-test (${mode}) missing Bun.Image: ${stdout}`
    );
  }
};

export const compileImageWorker = async (): Promise<{
  outfile: string;
  sizeBytes: number;
  target: string;
}> => {
  assertCompilerVersion();
  await mkdir(workerOutDir, { recursive: true });
  await rm(workerOutfile, { force: true });

  const primaryTarget = determineCompileTarget();
  const fallbackTarget =
    primaryTarget === "bun-linux-x64-baseline" ? "bun-linux-x64" : null;
  let compiledTarget = primaryTarget;

  try {
    compileWithTarget(primaryTarget);
  } catch (primaryError) {
    if (fallbackTarget === null) {
      throw primaryError;
    }

    console.warn(
      `Primary target ${primaryTarget} failed, retrying with ${fallbackTarget}`
    );
    await rm(workerOutfile, { force: true });
    compileWithTarget(fallbackTarget);
    compiledTarget = fallbackTarget;
  }

  await chmod(workerOutfile, 0o755);

  const workerStat = await stat(workerOutfile);
  if (workerStat.size === 0) {
    throw new Error("image-worker binary is empty");
  }

  console.log(
    `Built ${workerOutfile} (${formatBytes(workerStat.size)}) target=${compiledTarget}`
  );

  if (workerStat.size > WORKER_SIZE_WARNING_BYTES) {
    console.warn(
      `Warning: image-worker exceeds ${formatBytes(WORKER_SIZE_WARNING_BYTES)}`
    );
  }

  if (canRunSelfTest(compiledTarget)) {
    await runWorkerSelfTest("diagnostic");

    const fixtureExists = await Bun.file(fixturePath).exists();
    if (fixtureExists) {
      await runWorkerSelfTest("probe-image", {
        mode: "probe-image",
        source: {
          path: fixturePath,
          type: "path",
        },
      });
      console.log("image-worker probe-image self-test passed");
    } else {
      console.warn(`Skipping probe-image self-test: ${fixturePath} not found`);
    }
  } else {
    console.warn(
      `Skipping image-worker self-test for cross-compiled target ${compiledTarget} on ${process.platform}/${process.arch}`
    );
  }

  return {
    outfile: workerOutfile,
    sizeBytes: workerStat.size,
    target: compiledTarget,
  };
};

if (import.meta.main) {
  await compileImageWorker();
}
