import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const checks = ["check-types", "lint", "knip", "test"] as const;

for (const script of checks) {
  console.log(`\n> @vyrel/graphql-client ${script}`);
  const result = Bun.spawnSync({
    cmd: ["bun", "run", script],
    cwd: packageRoot,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`@vyrel/graphql-client ${script} failed`);
  }
}
