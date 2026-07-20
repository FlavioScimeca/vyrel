import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));

// Static reference for Vercel file tracing during experimental backends builds.
export const imageWorkerBundleReference = new URL(
  "../../dist/bin/image-worker",
  import.meta.url
);

export const imageWorkerBundlePath = join(
  moduleDir,
  "../../dist/bin/image-worker"
);

export const imageWorkerBundleExists = (): boolean =>
  existsSync(imageWorkerBundlePath);
