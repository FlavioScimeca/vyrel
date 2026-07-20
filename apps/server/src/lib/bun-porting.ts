import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  configureBunPorting,
  PORTING_WORKER_BINARY_NAME,
} from "@vyrel/bun-porting/bootstrap";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const binary = PORTING_WORKER_BINARY_NAME;

/**
 * Configure bun-porting path resolution for this server package.
 * Call before any code path that may spawn the porting worker (e.g. BunImage).
 *
 * Candidates cover local `apps/server` layouts and Vercel `/var/task` mounts.
 * After bundling, `import.meta.url` may point at dist/, so cwd + absolute
 * Vercel paths are the reliable production lookups.
 */
export const initBunPorting = (): void => {
  configureBunPorting({
    binaryPathCandidates: [
      join(process.cwd(), "bin", binary),
      join(process.cwd(), "dist/bin", binary),
      join(process.cwd(), "apps/server/dist/bin", binary),
      join(packageRoot, "dist/bin", binary),
      join(packageRoot, "bin", binary),
      `/var/task/bin/${binary}`,
      `/var/task/dist/bin/${binary}`,
      `/var/task/apps/server/dist/bin/${binary}`,
    ],
  });
};

initBunPorting();
