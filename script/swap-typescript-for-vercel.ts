import { existsSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const typescriptPath = join(root, "node_modules/typescript");
const typescript6Path = join(root, "node_modules/typescript6");

if (!existsSync(typescript6Path)) {
  console.log(
    "swap-typescript-for-vercel: typescript6 is not installed, skipping"
  );
  process.exit(0);
}

if (existsSync(typescriptPath)) {
  rmSync(typescriptPath, { recursive: true, force: true });
}

symlinkSync(typescript6Path, typescriptPath, "dir");
console.log(
  "swap-typescript-for-vercel: symlinked typescript6 -> typescript for Vercel builders"
);
