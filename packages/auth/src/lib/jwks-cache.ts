import { JWKS_CACHE_TTL_MS } from "@vyrel/consts/server";
import { createLocalJWKSet, type JSONWebKeySet } from "jose";
import { auth } from "..";

let cachedJwks: ReturnType<typeof createLocalJWKSet> | null = null;
let fetchedAt = 0;
const TTL_MS = JWKS_CACHE_TTL_MS;

/**
 * Cached JWKS for JWT verification.
 * Uses `auth.api.getJwks()` (in-process) to avoid HTTP/network latency.
 */
export async function getJwks(): Promise<ReturnType<typeof createLocalJWKSet>> {
  const now = Date.now();
  if (cachedJwks && now - fetchedAt < TTL_MS) {
    return cachedJwks;
  }

  const set = (await auth.api.getJwks()) as JSONWebKeySet;
  cachedJwks = createLocalJWKSet(set);
  fetchedAt = now;
  return cachedJwks;
}
