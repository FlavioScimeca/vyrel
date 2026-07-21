import { FileSystem, Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import {
  compilePortingWorker,
  createVercelEntryTracingSnippet,
} from "@vyrel/bun-porting/bootstrap";
import { Config, Effect, ManagedRuntime, Schema } from "effect";

import { initBunPorting } from "../src/lib/bun-porting";

const runtime = ManagedRuntime.make(BunContext.layer);
const encodeMetaJson = Schema.encodeSync(Schema.parseJson(Schema.Unknown));

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const packageRoot = path.join(import.meta.dirname, "..");
  const outdir = path.join(packageRoot, "dist");
  const outfile = path.join(outdir, "index.js");

  initBunPorting();

  const pkg = (yield* Effect.promise(() =>
    Bun.file(path.join(packageRoot, "package.json")).json()
  )) as { version: string };

  yield* fs.remove(outdir, { force: true, recursive: true });

  const analyze =
    (yield* Config.string("ANALYZE").pipe(Config.withDefault("0"))) === "1";

  const result = yield* Effect.promise(() =>
    Bun.build({
      banner: `/*! server v${pkg.version} */`,
      entrypoints: [path.join(packageRoot, "src/index.ts")],
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
      // Linked sourcemaps are unsupported by Vercel's Bun decoder
      // ("Could not decode sourcemap ... UnsupportedFormat").
      sourcemap: "none",
      target: "bun",
    })
  );

  if (!result.success) {
    for (const log of result.logs) {
      yield* Effect.logError(log);
    }
    return yield* Effect.die(new Error("Bun build failed"));
  }

  if (analyze && result.metafile !== undefined) {
    yield* fs.writeFileString(
      path.join(outdir, "meta.json"),
      encodeMetaJson(result.metafile)
    );
    yield* Effect.log("Wrote bundle metafile to dist/meta.json");
  }

  const bundlePath = path.join(outdir, "bundle.js");
  const bundle = yield* Effect.promise(() => Bun.file(bundlePath).text());
  const unresolvedWorkspaceImports = bundle.match(
    /from\s+["']@vyrel\/[^"']+["']/g
  );

  if (
    unresolvedWorkspaceImports !== null &&
    unresolvedWorkspaceImports.length > 0
  ) {
    return yield* Effect.die(
      new Error(
        `Bundle still has unresolved workspace imports: ${unresolvedWorkspaceImports.join(", ")}`
      )
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

  yield* Effect.promise(() => Bun.write(outfile, vercelEntry));

  const publicDir = path.join(packageRoot, "public");
  const faviconSource = path.join(publicDir, "favicon.ico");

  if (yield* Effect.promise(() => Bun.file(faviconSource).exists())) {
    yield* fs.copy(publicDir, path.join(outdir, "public"), {
      overwrite: true,
    });
    yield* Effect.log("Copied public/ to dist/public/");
  }

  yield* Effect.log(`Built ${bundlePath} (${formatBytes(bundle.length)})`);
  yield* Effect.log(`Wrote ${outfile} (Vercel entry shim)`);

  yield* Effect.promise(() => compilePortingWorker({ outdir }));
});

await runtime.runPromise(program);
