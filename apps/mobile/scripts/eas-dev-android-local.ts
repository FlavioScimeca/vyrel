#!/usr/bin/env bun

import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { config as loadEnvFile } from "dotenv";

const MOBILE_ROOT = join(import.meta.dir, "..");
const DIST_DIR = join(MOBILE_ROOT, "dist");

loadEnvFile({ path: join(MOBILE_ROOT, ".env") });

const { env } = await import("@vyrel/env/native");

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

const clearExistingApks = (directory: string): void => {
  for (const entry of readdirSync(directory)) {
    if (entry.endsWith(".apk")) {
      unlinkSync(join(directory, entry));
    }
  }
};

const startedAt = Date.now();
const apkName = `${env.APP_SLUG}-dev-app.apk`;

mkdirSync(DIST_DIR, { recursive: true });
clearExistingApks(DIST_DIR);

console.log(`Building Android development APK locally → dist/${apkName}\n`);

await $`bunx eas-cli@latest build --profile development --platform android --local --non-interactive --output ${`dist/${apkName}`}`.cwd(
  MOBILE_ROOT
);

console.log(`\nDone in ${formatDuration(Date.now() - startedAt)}.`);
