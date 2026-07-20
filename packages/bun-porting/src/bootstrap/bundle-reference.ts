import { existsSync } from "node:fs";
import { join } from "node:path";

import { resolvePortingWorkerPath } from "../internal/runner";
import { PORTING_WORKER_BINARY_NAME } from "./config";

/**
 * Snippet injected into the Vercel function entry so file tracing keeps the
 * compiled porting-worker binary inside the `.func` bundle.
 *
 * Expects the host entry already imports:
 *   existsSync, dirname, join, fileURLToPath
 */
export const createVercelEntryTracingSnippet = (
  relativeFromModuleDir = `bin/${PORTING_WORKER_BINARY_NAME}`
): string => `const moduleDir = dirname(fileURLToPath(import.meta.url));
export const portingWorkerBinaryPath = join(moduleDir, ${JSON.stringify(relativeFromModuleDir)});

// Keep the compiled worker in the traced function bundle.
if (existsSync(portingWorkerBinaryPath)) {
  void Bun.file(portingWorkerBinaryPath).size;
}
`;

export const getPortingWorkerBinaryPath = (): string | null =>
  resolvePortingWorkerPath();

export const portingWorkerBundleExists = (): boolean => {
  const path = resolvePortingWorkerPath();
  return path !== null && existsSync(path);
};

/** Default path candidates for apps/server deploy layouts. */
export const defaultServerBinaryPathCandidates = (
  packageRoot: string
): string[] => [
  join(packageRoot, "dist/bin", PORTING_WORKER_BINARY_NAME),
  join(packageRoot, "bin", PORTING_WORKER_BINARY_NAME),
  join(process.cwd(), "bin", PORTING_WORKER_BINARY_NAME),
  join(process.cwd(), "dist/bin", PORTING_WORKER_BINARY_NAME),
  `/var/task/bin/${PORTING_WORKER_BINARY_NAME}`,
  `/var/task/dist/bin/${PORTING_WORKER_BINARY_NAME}`,
  `/var/task/apps/server/dist/bin/${PORTING_WORKER_BINARY_NAME}`,
];
