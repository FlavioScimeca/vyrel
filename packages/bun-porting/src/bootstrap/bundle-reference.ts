import { Path } from "@effect/platform";
import { Effect } from "effect";

import { resolvePortingWorkerPath } from "../internal/runner";
import { bunPortingRuntime } from "../internal/runtime";
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

export const portingWorkerBundleExists = (): boolean =>
  resolvePortingWorkerPath() !== null;

const defaultServerBinaryPathCandidatesEffect = (
  packageRoot: string
): Effect.Effect<string[], never, Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const cwd = path.resolve(".");

    return [
      path.join(packageRoot, "dist/bin", PORTING_WORKER_BINARY_NAME),
      path.join(packageRoot, "bin", PORTING_WORKER_BINARY_NAME),
      path.join(cwd, "bin", PORTING_WORKER_BINARY_NAME),
      path.join(cwd, "dist/bin", PORTING_WORKER_BINARY_NAME),
      `/var/task/bin/${PORTING_WORKER_BINARY_NAME}`,
      `/var/task/dist/bin/${PORTING_WORKER_BINARY_NAME}`,
      `/var/task/apps/server/dist/bin/${PORTING_WORKER_BINARY_NAME}`,
    ];
  });

/** Default path candidates for apps/server deploy layouts. */
export const defaultServerBinaryPathCandidates = (
  packageRoot: string
): string[] =>
  bunPortingRuntime.runSync(
    defaultServerBinaryPathCandidatesEffect(packageRoot)
  );
