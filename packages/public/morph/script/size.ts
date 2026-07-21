import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";

initScriptLogging({ script: "morph-size" });

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(packageRoot, "dist");
const packCacheDir = join(packageRoot, "node_modules/.cache/morph-size");

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
const runtimeEntry = files.find((file) => file.path.endsWith("/index.js"));

log.info("morph-size", "@vyrel/morph dist size\n");
log.info("morph-size", `${"File".padEnd(28)} Size`);
log.info("morph-size", "-".repeat(40));

for (const file of files.toSorted((a, b) => b.size - a.size)) {
  const label = relative(distDir, file.path);
  log.info("morph-size", `${label.padEnd(28)} ${formatBytes(file.size)}`);
}

log.info("morph-size", "-".repeat(40));
log.info(
  "morph-size",
  `${"Total on disk".padEnd(28)} ${formatBytes(totalBytes)}`
);

if (runtimeEntry) {
  log.info(
    "morph-size",
    `${"Runtime entry (index.js)".padEnd(28)} ${formatBytes(runtimeEntry.size)}`
  );
}

const packSummary = await readPackSummary();

log.info("morph-size", "\nbun publish estimate\n");
log.info(
  "morph-size",
  `${"Tarball (compressed)".padEnd(28)} ${formatBytes(packSummary.tarballBytes)}`
);

if (packSummary.unpackedSize) {
  log.info(
    "morph-size",
    `${"Installed (unpacked)".padEnd(28)} ${packSummary.unpackedSize}`
  );
}

if (packSummary.totalFiles) {
  log.info(
    "morph-size",
    `${"Files in package".padEnd(28)} ${packSummary.totalFiles}`
  );
}
