import { Path } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(BunContext.layer);

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const packageRoot = path.join(import.meta.dirname, "..");
  const checks = ["check-types", "test"] as const;

  for (const script of checks) {
    yield* Effect.log(`\n> server ${script}`);
    const result = Bun.spawnSync({
      cmd: ["bun", "run", script],
      cwd: packageRoot,
      stderr: "inherit",
      stdout: "inherit",
    });

    if (result.exitCode !== 0) {
      return yield* Effect.die(new Error(`server ${script} failed`));
    }
  }
});

await runtime.runPromise(program);
