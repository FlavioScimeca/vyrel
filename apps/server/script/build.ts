import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const run = (script: string): void => {
  console.log(`\n> server ${script}`);
  const result = Bun.spawnSync({
    cmd: ["bun", "run", script],
    cwd: packageRoot,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`server ${script} failed`);
  }
};

run("script/verify.ts");
run("script/compiler.ts");
