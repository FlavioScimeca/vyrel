import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";

initScriptLogging({ script: "graphql-client-size" });

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(packageRoot, "dist");
const packCacheDir = join(
  packageRoot,
  "node_modules/.cache/graphql-client-size"
);

const UNPACKED_SIZE_REGEX = /Unpacked size:\s*(.+)/i;
const TOTAL_FILES_REGEX = /Total files:\s*(\d+)/i;

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

const readPackSummary = async () => {
  const dryRun = Bun.spawnSync({
    cmd: ["bun", "pm", "pack", "--dry-run"],
    cwd: packageRoot,
    stderr: "pipe",
    stdout: "pipe",
  });
  if (dryRun.exitCode !== 0) {
    throw new Error("bun pm pack --dry-run failed");
  }

  const output = `${dryRun.stdout}\n${dryRun.stderr}`;
  const unpackedSize = output.match(UNPACKED_SIZE_REGEX)?.[1]?.trim();
  const totalFiles = output.match(TOTAL_FILES_REGEX)?.[1]?.trim();

  await mkdir(packCacheDir, { recursive: true });
  const pack = Bun.spawnSync({
    cmd: ["bun", "pm", "pack", "--destination", packCacheDir, "--quiet"],
    cwd: packageRoot,
    stdout: "pipe",
  });
  if (pack.exitCode !== 0) {
    throw new Error("bun pm pack failed");
  }

  const tarballName = basename(pack.stdout.toString().trim());
  const tarballPath = join(packCacheDir, tarballName);
  const tarballBytes = (await stat(tarballPath)).size;
  await rm(tarballPath, { force: true });

  return { tarballBytes, totalFiles, unpackedSize };
};

const distExists = await stat(distDir).catch(() => null);
if (!distExists?.isDirectory()) {
  throw new Error("dist/ not found. Run `bun run build` first.");
}

const files = await listDistFiles(distDir);
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

log.info("graphql-client-size", "@vyrel/graphql-client dist size\n");
log.info("graphql-client-size", `${"File".padEnd(32)} Size`);
log.info("graphql-client-size", "-".repeat(44));

for (const file of files.toSorted((left, right) => right.size - left.size)) {
  log.info(
    "graphql-client-size",
    `${relative(distDir, file.path).padEnd(32)} ${formatBytes(file.size)}`
  );
}

log.info("graphql-client-size", "-".repeat(44));
log.info(
  "graphql-client-size",
  `${"Total on disk".padEnd(32)} ${formatBytes(totalBytes)}`
);

const packSummary = await readPackSummary();

log.info("graphql-client-size", "\nbun publish estimate\n");
log.info(
  "graphql-client-size",
  `${"Tarball (compressed)".padEnd(32)} ${formatBytes(packSummary.tarballBytes)}`
);
if (packSummary.unpackedSize) {
  log.info(
    "graphql-client-size",
    `${"Installed (unpacked)".padEnd(32)} ${packSummary.unpackedSize}`
  );
}
if (packSummary.totalFiles) {
  log.info(
    "graphql-client-size",
    `${"Files in package".padEnd(32)} ${packSummary.totalFiles}`
  );
}
