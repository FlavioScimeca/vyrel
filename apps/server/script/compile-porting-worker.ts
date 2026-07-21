import { Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { compilePortingWorker } from "@vyrel/bun-porting/bootstrap";
import { Effect, ManagedRuntime } from "effect";

import { initBunPorting } from "../src/lib/bun-porting";

const runtime = ManagedRuntime.make(BunContext.layer);

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const packageRoot = path.join(import.meta.dirname, "..");

  initBunPorting();
  yield* Effect.promise(() =>
    compilePortingWorker({ outdir: path.join(packageRoot, "dist") })
  );
});

await runtime.runPromise(program);
