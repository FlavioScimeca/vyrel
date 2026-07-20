import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { compilePortingWorker } from "@vyrel/bun-porting/bootstrap";

import { initBunPorting } from "../src/lib/bun-porting";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

initBunPorting();
await compilePortingWorker({ outdir: join(packageRoot, "dist") });
