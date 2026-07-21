import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";

initScriptLogging({ script: "web-prebuild" });

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = join(packageRoot, "../..");

const run = (cmd: string[], cwd: string, label: string): void => {
  log.info("web-prebuild", `\n> web ${label}`);
  const result = Bun.spawnSync({
    cmd,
    cwd,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`web ${label} failed`);
  }
};

const runNamedScript = (script: string): void => {
  run(["bun", "run", script], packageRoot, script);
};

// Next.js needs classic typescript/lib/typescript.js; TS 7 does not ship it.
run(
  ["bun", "run", "script/swap-typescript-for-vercel.ts"],
  monorepoRoot,
  "swap-typescript-for-vercel"
);

const skipSchemaGeneration =
  process.env.SKIP_GRAPHQL_SCHEMA === "1" || process.env.VERCEL === "1";

if (skipSchemaGeneration) {
  log.info(
    "web-prebuild",
    "web prebuild: skipping graphql:schema (using committed apps/web/schema.graphql)"
  );
} else {
  runNamedScript("graphql:schema");
}

runNamedScript("gql:generate");
runNamedScript("gql:client");
