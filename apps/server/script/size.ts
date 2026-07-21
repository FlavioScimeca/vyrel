import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { BunContext } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(BunContext.layer);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type DistFile = { path: string; size: number };

const listDistFiles = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  directory: string
): Effect.Effect<DistFile[], PlatformError> =>
  Effect.gen(function* () {
    const files: DistFile[] = [];

    for (const entry of yield* fs.readDirectory(directory)) {
      const fullPath = path.join(directory, entry);
      const info = yield* fs.stat(fullPath);

      if (info.type === "Directory") {
        files.push(...(yield* listDistFiles(fs, path, fullPath)));
      } else if (info.type === "File") {
        files.push({ path: fullPath, size: Number(info.size) });
      }
    }

    return files;
  });

const WORKER_SIZE_WARNING_BYTES = 80 * 1024 * 1024;

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const packageRoot = path.join(import.meta.dirname, "..");
  const distDir = path.join(packageRoot, "dist");
  const distExists = yield* fs.exists(distDir);

  if (!distExists) {
    return yield* Effect.die(
      new Error("dist/ not found. Run `bun run build` first.")
    );
  }

  const files = yield* listDistFiles(fs, path, distDir);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const runtimeEntry = files.find((file) => file.path.endsWith("/bundle.js"));
  const workerEntry = files.find((file) =>
    file.path.endsWith("/bin/porting-worker")
  );

  yield* Effect.log("server dist size\n");
  yield* Effect.log(`${"File".padEnd(28)} Size`);
  yield* Effect.log("-".repeat(40));

  for (const file of files.toSorted((left, right) => right.size - left.size)) {
    const label = path.relative(distDir, file.path);
    yield* Effect.log(`${label.padEnd(28)} ${formatBytes(file.size)}`);
  }

  yield* Effect.log("-".repeat(40));
  yield* Effect.log("Total on disk".padEnd(28) + formatBytes(totalBytes));

  if (workerEntry === undefined) {
    yield* Effect.logError("\nError: dist/bin/porting-worker is missing");
    return yield* Effect.die(new Error("dist/bin/porting-worker is missing"));
  }
  yield* Effect.log(
    "Porting worker (bin/porting-worker)".padEnd(28) +
      formatBytes(workerEntry.size)
  );

  if (workerEntry.size > WORKER_SIZE_WARNING_BYTES) {
    yield* Effect.log(
      `\nWarning: porting-worker exceeds ${formatBytes(WORKER_SIZE_WARNING_BYTES)}`
    );
  }

  if (runtimeEntry !== undefined) {
    yield* Effect.log(
      "Runtime bundle (bundle.js)".padEnd(28) + formatBytes(runtimeEntry.size)
    );

    const bundle = yield* Effect.promise(() =>
      Bun.file(runtimeEntry.path).text()
    );
    const unresolvedWorkspaceImports = bundle.match(
      /from\s+["']@vyrel\/[^"']+["']/g
    );

    if (
      unresolvedWorkspaceImports !== null &&
      unresolvedWorkspaceImports.length > 0
    ) {
      yield* Effect.log(
        "\nWarning: unresolved workspace imports detected in runtime bundle"
      );
      for (const unresolvedImport of unresolvedWorkspaceImports) {
        yield* Effect.log(`- ${unresolvedImport}`);
      }
      return yield* Effect.die(
        new Error("Unresolved workspace imports in runtime bundle")
      );
    }

    yield* Effect.log("\nWorkspace imports: bundled");
  }
});

await runtime.runPromise(program);
