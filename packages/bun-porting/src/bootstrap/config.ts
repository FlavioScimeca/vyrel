export type BunPortingConfig = {
  /** Absolute paths tried when resolving the compiled porting-worker binary. */
  binaryPathCandidates: string[];
  /** Bun version used to compile the standalone worker. */
  compilerVersion: string;
  /** Default spawn timeout in milliseconds. */
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
};

const DEFAULT_COMPILER_VERSION = "1.3.14";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_STDOUT_BYTES = 1024 * 1024;
const DEFAULT_MAX_STDERR_BYTES = 1024 * 1024;

let config: BunPortingConfig = {
  binaryPathCandidates: [],
  compilerVersion: DEFAULT_COMPILER_VERSION,
  maxStderrBytes: DEFAULT_MAX_STDERR_BYTES,
  maxStdoutBytes: DEFAULT_MAX_STDOUT_BYTES,
  timeoutMs: DEFAULT_TIMEOUT_MS,
};

export const configureBunPorting = (
  partial: Partial<BunPortingConfig>
): BunPortingConfig => {
  config = {
    ...config,
    ...partial,
    binaryPathCandidates:
      partial.binaryPathCandidates ?? config.binaryPathCandidates,
  };
  return config;
};

export const getBunPortingConfig = (): BunPortingConfig => config;

export const isNativeImageAvailable = (): boolean =>
  typeof Bun !== "undefined" && typeof Bun.Image === "function";

export const PORTING_WORKER_BINARY_NAME = "porting-worker";
export const DEFAULT_BUN_COMPILER_VERSION = DEFAULT_COMPILER_VERSION;
