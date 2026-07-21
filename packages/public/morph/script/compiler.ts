import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";

initScriptLogging({ script: "morph-compiler" });

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = join(packageRoot, "dist");

const pkg = (await Bun.file(join(packageRoot, "package.json")).json()) as {
  version: string;
};

await rm(outdir, { force: true, recursive: true });

const analyze = process.env.ANALYZE === "1";

const result = await Bun.build({
  banner: `/*! @vyrel/morph v${pkg.version} | MIT */`,
  entrypoints: [join(packageRoot, "src/index.ts")],
  env: "disable",
  format: "esm",
  metafile: analyze,
  minify: {
    identifiers: true,
    keepNames: true,
    syntax: true,
    whitespace: true,
  },
  outdir,
  packages: "external",
  sourcemap: "none",
  target: "node",
});

if (!result.success) {
  for (const entry of result.logs) {
    log.error("morph-compiler", String(entry));
  }
  throw new Error("Bun build failed");
}

if (analyze && result.metafile) {
  await Bun.write(
    join(outdir, "meta.json"),
    JSON.stringify(result.metafile, null, 2)
  );
  log.info("morph-compiler", "Wrote bundle metafile to dist/meta.json");
}

const types = Bun.spawnSync({
  cmd: ["tsc", "--project", "tsconfig.build.json"],
  cwd: packageRoot,
  stderr: "inherit",
  stdout: "inherit",
});

if (types.exitCode !== 0) {
  throw new Error("Type declaration generation failed");
}
