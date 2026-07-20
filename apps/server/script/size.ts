import { readdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(packageRoot, "dist");

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const listDistFiles = async (
  directory: string
): Promise<{ path: string; size: number }[]> => {
  const entries = await readdir(directory, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listDistFiles(fullPath);
      }

      if (entry.isFile()) {
        const fileStat = await stat(fullPath);
        return [{ path: fullPath, size: fileStat.size }];
      }

      return [];
    })
  );

  return nested.flat();
};

const distExists = await stat(distDir).catch(() => null);

if (!distExists?.isDirectory()) {
  throw new Error("dist/ not found. Run `bun run build` first.");
}

const WORKER_SIZE_WARNING_BYTES = 80 * 1024 * 1024;

const files = await listDistFiles(distDir);
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const runtimeEntry = files.find((file) => file.path.endsWith("/bundle.js"));
const workerEntry = files.find((file) =>
  file.path.endsWith("/bin/porting-worker")
);

console.log("server dist size\n");
console.log("File".padEnd(28), "Size");
console.log("-".repeat(40));

for (const file of files.toSorted((left, right) => right.size - left.size)) {
  const label = relative(distDir, file.path);
  console.log(label.padEnd(28), formatBytes(file.size));
}

console.log("-".repeat(40));
console.log("Total on disk".padEnd(28), formatBytes(totalBytes));

if (workerEntry) {
  console.log(
    "Porting worker (bin/porting-worker)".padEnd(28),
    formatBytes(workerEntry.size)
  );

  if (workerEntry.size > WORKER_SIZE_WARNING_BYTES) {
    console.log(
      `\nWarning: porting-worker exceeds ${formatBytes(WORKER_SIZE_WARNING_BYTES)}`
    );
  }
} else {
  console.error("\nError: dist/bin/porting-worker is missing");
  process.exit(1);
}

if (runtimeEntry) {
  console.log(
    "Runtime bundle (bundle.js)".padEnd(28),
    formatBytes(runtimeEntry.size)
  );
}

if (runtimeEntry) {
  const bundle = await Bun.file(runtimeEntry.path).text();
  const unresolvedWorkspaceImports = bundle.match(
    /from\s+["']@vyrel\/[^"']+["']/g
  );

  if (unresolvedWorkspaceImports?.length) {
    console.log(
      "\nWarning: unresolved workspace imports detected in runtime bundle"
    );
    for (const unresolvedImport of unresolvedWorkspaceImports) {
      console.log(`- ${unresolvedImport}`);
    }
    process.exit(1);
  }

  console.log("\nWorkspace imports: bundled");
}
