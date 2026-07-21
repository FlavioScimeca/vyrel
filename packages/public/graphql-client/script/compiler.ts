import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";

initScriptLogging({ script: "graphql-client-compiler" });

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = join(packageRoot, "dist");

const pkg = (await Bun.file(join(packageRoot, "package.json")).json()) as {
  version: string;
};

await rm(outdir, { force: true, recursive: true });

const analyze = process.env.ANALYZE === "1";
const metafiles: Record<string, unknown> = {};

const buildEntry = async (entrypoint: string, client: boolean) => {
  const result = await Bun.build({
    banner: `${client ? '"use client";\n' : ""}/*! @vyrel/graphql-client v${pkg.version} | MIT */`,
    entrypoints: [join(packageRoot, entrypoint)],
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
      log.error("graphql-client-compiler", String(entry));
    }
    throw new Error("Bun build failed");
  }

  if (analyze && result.metafile) {
    metafiles[basename(entrypoint, ".ts")] = result.metafile;
  }
};

await buildEntry("src/index.ts", true);
await buildEntry("src/cache.ts", false);
await buildEntry("src/codegen.ts", false);
await buildEntry("src/codegen-plugin.ts", false);

if (analyze) {
  await Bun.write(
    join(outdir, "meta.json"),
    JSON.stringify(metafiles, null, 2)
  );
  log.info(
    "graphql-client-compiler",
    "Wrote bundle metafiles to dist/meta.json"
  );
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
