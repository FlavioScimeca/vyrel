import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";

initScriptLogging({ script: "graphql-client-build" });

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const run = (script: string): void => {
  log.info("graphql-client-build", `\n> @vyrel/graphql-client ${script}`);
  const result = Bun.spawnSync({
    cmd: ["bun", "run", script],
    cwd: packageRoot,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`@vyrel/graphql-client ${script} failed`);
  }
};

run("script/verify.ts");
run("script/compiler.ts");
