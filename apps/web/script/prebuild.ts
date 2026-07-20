import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const run = (script: string): void => {
  console.log(`\n> web ${script}`);
  const result = Bun.spawnSync({
    cmd: ["bun", "run", script],
    cwd: packageRoot,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`web ${script} failed`);
  }
};

const skipSchemaGeneration =
  process.env.SKIP_GRAPHQL_SCHEMA === "1" || process.env.VERCEL === "1";

if (skipSchemaGeneration) {
  console.log(
    "web prebuild: skipping graphql:schema (using committed apps/web/schema.graphql)"
  );
} else {
  run("graphql:schema");
}

run("gql:generate");
run("gql:client");
