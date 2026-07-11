import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const alreadyPublishedPattern =
  /cannot publish over the previously published versions/i;

const run = (args: string[]): { exitCode: number; output: string } => {
  const result = Bun.spawnSync(args, {
    cwd: repoRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
};

const buildVerified = (): void => {
  const { exitCode, output } = run([
    "bun",
    "x",
    "turbo",
    "run",
    "build:verified",
    "--filter=./packages/public/*",
  ]);

  if (exitCode !== 0) {
    console.error(output);
    process.exit(exitCode);
  }
};

const publishPackages = (): void => {
  const { exitCode, output } = run(["bunx", "changeset", "publish"]);

  if (exitCode === 0) {
    return;
  }

  if (alreadyPublishedPattern.test(output)) {
    console.log("Packages already published on npm — skipping.");
    return;
  }

  console.error(output);
  process.exit(exitCode);
};

buildVerified();
publishPackages();
