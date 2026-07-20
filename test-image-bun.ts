#!/usr/bin/env bun
/**
 * TEMP smoke tests for Vercel preview diagnostics (delete after testing).
 *
 * Usage:
 *   bun test-image-bun.ts              # bun + worker
 *   bun test-image-bun.ts bun
 *   bun test-image-bun.ts worker
 *   bun test-image-bun.ts probe        # needs DIAGNOSTIC_STORAGE_KEY or DIAGNOSTIC_SOURCE_URL
 *   bun test-image-bun.ts all
 */

const DEPLOYMENT_URL =
  "https://vyrel-server-git-feat-bun-image-worker-flavioscimecas-projects.vercel.app";

// TEMP hardcoded bypass — delete this file when done testing
const BYPASS_SECRET = "CpGYGtUNy53G0tbE1GDbXG6Wi35AMBSC";

type CheckResult = {
  name: string;
  ok: boolean;
  status: number;
  body: unknown;
};

const requestHeaders = (): HeadersInit => ({
  Accept: "application/json",
  "x-vercel-protection-bypass": BYPASS_SECRET,
});

const printJson = (value: unknown): void => {
  console.log(JSON.stringify(value, null, 2));
};

const request = async (
  path: string,
  init?: RequestInit
): Promise<CheckResult> => {
  const url = `${DEPLOYMENT_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...requestHeaders(),
      ...init?.headers,
    },
  });

  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text
  }

  return {
    body,
    name: `${init?.method ?? "GET"} ${path}`,
    ok: response.ok,
    status: response.status,
  };
};

const report = (result: CheckResult): boolean => {
  const mark = result.ok ? "ok" : "FAIL";
  console.log(`\n[${mark}] ${result.name} → ${result.status}`);
  printJson(result.body);
  return result.ok;
};

const checkBun = async (): Promise<boolean> => {
  const result = await request("/check-bun");
  return report(result);
};

const checkWorker = async (): Promise<boolean> => {
  const result = await request("/check-image-worker");
  return report(result);
};

const checkProbe = async (): Promise<boolean> => {
  const storageKey = process.env.DIAGNOSTIC_STORAGE_KEY;
  const sourceUrl = process.env.DIAGNOSTIC_SOURCE_URL;

  if (!(storageKey || sourceUrl)) {
    console.error(
      "\nprobe needs DIAGNOSTIC_STORAGE_KEY (preferred on Vercel) or DIAGNOSTIC_SOURCE_URL (dev only)."
    );
    console.error(
      'Example: DIAGNOSTIC_STORAGE_KEY="diagnostics/sample.png" bun test-image-bun.ts probe'
    );
    return false;
  }

  const body = storageKey ? { storageKey } : { sourceUrl: sourceUrl as string };

  const result = await request("/check-image-worker", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return report(result);
};

const usage = (): void => {
  console.log(`Usage:
  bun test-image-bun.ts [bun|worker|probe|all]`);
};

const main = async (): Promise<void> => {
  const command = process.argv[2] ?? "all";

  if (command === "help" || command === "-h" || command === "--help") {
    usage();
    return;
  }

  console.log(`Target: ${DEPLOYMENT_URL}`);

  const results: boolean[] = [];

  if (command === "bun" || command === "all") {
    results.push(await checkBun());
  }
  if (command === "worker" || command === "all") {
    results.push(await checkWorker());
  }
  if (command === "probe") {
    results.push(await checkProbe());
  }

  if (
    command !== "bun" &&
    command !== "worker" &&
    command !== "probe" &&
    command !== "all"
  ) {
    usage();
    process.exit(1);
  }

  const failed = results.filter((ok) => !ok).length;
  console.log(
    `\nDone: ${results.length - failed}/${results.length} checks passed.`
  );
  process.exit(failed > 0 ? 1 : 0);
};

await main();
