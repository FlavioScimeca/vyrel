import { Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import {
  configureBunPorting,
  PORTING_WORKER_BINARY_NAME,
} from "@vyrel/bun-porting/bootstrap";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(BunContext.layer);
const binary = PORTING_WORKER_BINARY_NAME;

const paths = runtime.runSync(
  Effect.gen(function* () {
    const path = yield* Path.Path;
    return {
      cwd: path.resolve("."),
      packageRoot: path.resolve(import.meta.dirname, "../.."),
      path,
    };
  })
);

/**
 * Configure bun-porting path resolution for this server package.
 * Call before any code path that may spawn the porting worker (e.g. BunImage).
 *
 * Candidates cover local `apps/server` layouts and Vercel `/var/task` mounts.
 * After bundling, `import.meta.url` may point at dist/, so cwd + absolute
 * Vercel paths are the reliable production lookups.
 */
export const initBunPorting = (): void => {
  const { cwd, packageRoot, path } = paths;

  configureBunPorting({
    binaryPathCandidates: [
      path.join(cwd, "bin", binary),
      path.join(cwd, "dist/bin", binary),
      path.join(cwd, "apps/server/dist/bin", binary),
      path.join(packageRoot, "dist/bin", binary),
      path.join(packageRoot, "bin", binary),
      `/var/task/bin/${binary}`,
      `/var/task/dist/bin/${binary}`,
      `/var/task/apps/server/dist/bin/${binary}`,
    ],
  });
};

initBunPorting();
