import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = join(packageRoot, "dist");

const pkg = (await Bun.file(join(packageRoot, "package.json")).json()) as {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
};

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

await rm(outdir, { force: true, recursive: true });

const result = await Bun.build({
	entrypoints: [join(packageRoot, "src/index.ts")],
	external,
	format: "esm",
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

const types = Bun.spawnSync({
	cmd: ["tsc", "--project", "tsconfig.build.json"],
	cwd: packageRoot,
	stderr: "inherit",
	stdout: "inherit",
});

if (types.exitCode !== 0) {
	throw new Error("Type declaration generation failed");
}
