import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
const outdir = join(packageRoot, "dist");
const outfile = join(outdir, "index.js");

const pkg = (await Bun.file(join(packageRoot, "package.json")).json()) as {
  version: string;
};

await rm(outdir, { force: true, recursive: true });

const analyze = process.env.ANALYZE === "1";

const result = await Bun.build({
  banner: `/*! server v${pkg.version} */`,
  entrypoints: [join(packageRoot, "src/index.ts")],
  format: "esm",
  metafile: analyze,
  minify: {
    identifiers: true,
    keepNames: true,
    syntax: true,
    whitespace: true,
  },
  outdir,
  sourcemap: "linked",
  target: "bun",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  throw new Error("Bun build failed");
}

if (analyze && result.metafile) {
  await Bun.write(
    join(outdir, "meta.json"),
    JSON.stringify(result.metafile, null, 2)
  );
  console.log("Wrote bundle metafile to dist/meta.json");
}

const bundle = await Bun.file(outfile).text();
const unresolvedWorkspaceImports = bundle.match(
  /from\s+["']@vyrel\/[^"']+["']/g
);

if (unresolvedWorkspaceImports?.length) {
  throw new Error(
    `Bundle still has unresolved workspace imports: ${unresolvedWorkspaceImports.join(", ")}`
  );
}

console.log(`Built ${outfile} (${formatBytes(bundle.length)})`);
