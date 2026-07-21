import { JWKS_CACHE_TTL_MS } from "@vyrel/consts/server";
import { Clock, Effect } from "effect";
import { createLocalJWKSet, type JSONWebKeySet } from "jose";
import { auth } from "..";

let cachedJwks: ReturnType<typeof createLocalJWKSet> | null = null;
let fetchedAt = 0;
const TTL_MS = JWKS_CACHE_TTL_MS;

/**
 * Cached JWKS for JWT verification.
 * Uses `auth.api.getJwks()` (in-process) to avoid HTTP/network latency.
 */
export const getJwks = (): Promise<ReturnType<typeof createLocalJWKSet>> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;

      if (cachedJwks !== null && now - fetchedAt < TTL_MS) {
        return cachedJwks;
      }

      const set = (yield* Effect.promise(() =>
        auth.api.getJwks()
      )) as JSONWebKeySet;
      cachedJwks = createLocalJWKSet(set);
      fetchedAt = now;
      return cachedJwks;
    })
  );
