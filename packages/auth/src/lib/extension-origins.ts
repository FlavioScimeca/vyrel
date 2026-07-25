import { env } from "@vyrel/env/server";

/** Explicit extension origins from `EXTENSION_ORIGINS` (comma-separated). */
export function getConfiguredExtensionOrigins(): string[] {
  const raw = env.EXTENSION_ORIGINS;
  if (raw === undefined || raw.trim().length === 0) {
    return [];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Origins allowed for browser extensions (dev wildcards + configured IDs). */
export function getExtensionTrustedOrigins(isDevelopment: boolean): string[] {
  const configured = getConfiguredExtensionOrigins();

  if (isDevelopment) {
    return ["chrome-extension://*", "moz-extension://*", ...configured];
  }

  return configured;
}
