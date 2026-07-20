import { cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compilePortingWorker,
  createVercelEntryTracingSnippet,
} from "@vyrel/bun-porting/bootstrap";

import { initBunPorting } from "../src/lib/bun-porting";

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

initBunPorting();

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
  naming: {
    entry: "bundle.[ext]",
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

const bundlePath = join(outdir, "bundle.js");
const bundle = await Bun.file(bundlePath).text();
const unresolvedWorkspaceImports = bundle.match(
  /from\s+["']@vyrel\/[^"']+["']/g
);

if (unresolvedWorkspaceImports?.length) {
  throw new Error(
    `Bundle still has unresolved workspace imports: ${unresolvedWorkspaceImports.join(", ")}`
  );
}

const tracingSnippet = createVercelEntryTracingSnippet("bin/porting-worker");

const vercelEntry = `import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Elysia } from "elysia";

void Elysia;

import app from "./bundle.js";

${tracingSnippet}
export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(\`Server is running on http://localhost:\${port}\`);
  });
}
`;

await Bun.write(outfile, vercelEntry);

const publicDir = join(packageRoot, "public");
const faviconSource = join(publicDir, "favicon.ico");

if (await Bun.file(faviconSource).exists()) {
  await cp(publicDir, join(outdir, "public"), { recursive: true });
  console.log("Copied public/ to dist/public/");
}

console.log(`Built ${bundlePath} (${formatBytes(bundle.length)})`);
console.log(`Wrote ${outfile} (Vercel entry shim)`);

await compilePortingWorker({ outdir });
