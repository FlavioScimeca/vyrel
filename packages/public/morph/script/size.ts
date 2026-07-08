import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(packageRoot, "dist");
const packCacheDir = join(packageRoot, "node_modules/.cache/morph-size");

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
	directory: string,
): Promise<{ path: string; size: number }[]> => {
	const entries = await readdir(directory, { withFileTypes: true });
	const files: { path: string; size: number }[] = [];

	for (const entry of entries) {
		const fullPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await listDistFiles(fullPath)));
			continue;
		}

		if (entry.isFile()) {
			const fileStat = await stat(fullPath);
			files.push({ path: fullPath, size: fileStat.size });
		}
	}

	return files;
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
	const unpackedSize = output.match(/Unpacked size:\s*(.+)/i)?.[1]?.trim();
	const totalFiles = output.match(/Total files:\s*(\d+)/i)?.[1]?.trim();

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

console.log("@vyrel/morph dist size\n");
console.log("File".padEnd(28), "Size");
console.log("-".repeat(40));

for (const file of files.toSorted((a, b) => b.size - a.size)) {
	const label = relative(distDir, file.path);
	console.log(label.padEnd(28), formatBytes(file.size));
}

console.log("-".repeat(40));
console.log("Total on disk".padEnd(28), formatBytes(totalBytes));

if (runtimeEntry) {
	console.log(
		"Runtime entry (index.js)".padEnd(28),
		formatBytes(runtimeEntry.size),
	);
}

const packSummary = await readPackSummary();

console.log("\nbun publish estimate\n");
console.log(
	"Tarball (compressed)".padEnd(28),
	formatBytes(packSummary.tarballBytes),
);

if (packSummary.unpackedSize) {
	console.log("Installed (unpacked)".padEnd(28), packSummary.unpackedSize);
}

if (packSummary.totalFiles) {
	console.log("Files in package".padEnd(28), packSummary.totalFiles);
}
