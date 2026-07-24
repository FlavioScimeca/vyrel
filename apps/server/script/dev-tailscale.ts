import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
} from "@effect/platform";
import { env } from "@vyrel/env/server";
import { log } from "@vyrel/logging";
import { initScriptLogging } from "@vyrel/logging/script";
import { Data, Duration, Effect, ManagedRuntime, Schedule } from "effect";

const READY_ATTEMPTS = 40;
const READY_INTERVAL_MS = 250;
const EXPECTED_BODY = "OK";
const SCRIPT = "server-dev-tailscale";
const FUNNEL_URL_RE = /https:\/\/[^\s/]+\.ts\.net\/?/i;
const FUNNEL_ON_RE = /funnel on/i;
const TRAILING_SLASH_RE = /\/$/;

initScriptLogging({ script: SCRIPT });

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

class FunnelProbeError extends Data.TaggedError("FunnelProbeError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

function runTailscale(args: string[]): string {
  const result = Bun.spawnSync({
    cmd: ["tailscale", ...args],
    stderr: "pipe",
    stdout: "pipe",
  });

  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim();
    throw new Error(
      stderr.length > 0
        ? `tailscale ${args.join(" ")} failed: ${stderr}`
        : `tailscale ${args.join(" ")} failed (exit ${String(result.exitCode)})`
    );
  }

  return result.stdout.toString().trim();
}

function assertTailscaleUp(): void {
  runTailscale(["status"]);
}

function parseFunnelUrl(output: string): string | null {
  const match = FUNNEL_URL_RE.exec(output);
  if (match === null) {
    return null;
  }
  return match[0].replace(TRAILING_SLASH_RE, "");
}

function isFunnelOn(statusOutput: string): boolean {
  return (
    FUNNEL_ON_RE.test(statusOutput) || parseFunnelUrl(statusOutput) !== null
  );
}

function ensureFunnel(serverPort: number): string {
  const status = runTailscale(["funnel", "status"]);

  if (isFunnelOn(status)) {
    log.info(SCRIPT, "Funnel already on — turning off before restart");
    runTailscale(["funnel", "--https=443", "off"]);
  }

  const startOutput = runTailscale([
    "funnel",
    "--bg",
    `http://127.0.0.1:${String(serverPort)}`,
  ]);
  log.info(SCRIPT, startOutput);

  const fromStart = parseFunnelUrl(startOutput);
  if (fromStart !== null) {
    return fromStart;
  }

  const afterStart = runTailscale(["funnel", "status"]);
  const fromStatus = parseFunnelUrl(afterStart);
  if (fromStatus !== null) {
    return fromStatus;
  }

  throw new Error(
    `Could not parse Funnel HTTPS URL from:\n${startOutput}\n${afterStart}`
  );
}

const probeErrorMessage = (cause: unknown): string => {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (
    typeof cause === "object" &&
    cause !== null &&
    "message" in cause &&
    typeof cause.message === "string"
  ) {
    return cause.message;
  }
  return String(cause);
};

const probeFunnelOk = (
  probeUrl: string
): Effect.Effect<void, FunnelProbeError, HttpClient.HttpClient> =>
  HttpClient.get(probeUrl).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) =>
      Effect.gen(function* () {
        const body = (yield* response.text).trim();

        if (body.toUpperCase() !== EXPECTED_BODY) {
          return yield* new FunnelProbeError({
            message: `expected status OK + body "${EXPECTED_BODY}", got ${String(response.status)} "${body}"`,
          });
        }
      })
    ),
    Effect.scoped,
    Effect.mapError((cause) =>
      cause instanceof FunnelProbeError
        ? cause
        : new FunnelProbeError({
            cause,
            message: probeErrorMessage(cause),
          })
    )
  );

const waitForFunnelOk = (
  probeUrl: string
): Effect.Effect<void, FunnelProbeError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    yield* probeFunnelOk(probeUrl).pipe(
      Effect.retry({
        schedule: Schedule.spaced(Duration.millis(READY_INTERVAL_MS)),
        times: READY_ATTEMPTS - 1,
      }),
      Effect.mapError(
        (cause) =>
          new FunnelProbeError({
            cause,
            message: `Funnel probe failed for ${probeUrl} after ${String(READY_ATTEMPTS)} attempts: ${cause.message}`,
          })
      )
    );

    log.info(SCRIPT, `Funnel probe OK: ${probeUrl}`);
  });

const packageRoot = `${import.meta.dirname}/..`;
const port = env.PORT;

assertTailscaleUp();
const funnelUrl = ensureFunnel(port);

log.info(SCRIPT, `Local URL:   http://localhost:${String(port)}`);
log.info(SCRIPT, `Funnel URL:  ${funnelUrl}`);
log.info(
  SCRIPT,
  `Set EXPO_PUBLIC_SERVER_URL and BETTER_AUTH_URL to ${funnelUrl}`
);

const server = Bun.spawn({
  cmd: ["bun", "run", "--hot", "src/index.ts"],
  cwd: packageRoot,
  stderr: "inherit",
  stdout: "inherit",
});

const shutdown = () => {
  server.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await runtime.runPromise(waitForFunnelOk(funnelUrl));
} catch (error) {
  server.kill();
  throw error;
}

const exitCode = await server.exited;
process.exit(exitCode ?? 0);
