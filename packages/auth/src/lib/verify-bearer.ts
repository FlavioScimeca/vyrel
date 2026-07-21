import { env } from "@vyrel/env/server";
import { Data, Effect, Option } from "effect";
import { jwtVerify } from "jose";

import { getJwks } from "./jwks-cache";

export interface AuthClaims {
  authorized: boolean;
  email: string;
  emailVerified: boolean;
  id: string;
  image: string | null;
  name: string;
}

class VerifyBearerError extends Data.TaggedError("VerifyBearerError")<{
  readonly cause: unknown;
}> {}

/** Must match `betterAuth({ baseURL })` — used as JWT `iss` / `aud`. */
const issuerAudience = env.BETTER_AUTH_URL;

export const verifyBearer = (
  headers: Headers
): Promise<AuthClaims | undefined> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const h = headers.get("authorization");
      if (h === null || !h.startsWith("Bearer ")) {
        return;
      }
      const token = h.slice(7).trim();
      if (token.length === 0) {
        return;
      }

      const jwks = yield* Effect.promise(() => getJwks());
      const verified = yield* Effect.tryPromise({
        catch: (cause) => new VerifyBearerError({ cause }),
        try: () =>
          jwtVerify(token, jwks, {
            audience: issuerAudience,
            issuer: issuerAudience,
          }),
      }).pipe(
        Effect.tapError((error) => Effect.logError(error)),
        Effect.option
      );

      if (Option.isNone(verified)) {
        return;
      }

      const { payload } = verified.value;
      if (payload.sub === undefined || payload.sub.length === 0) {
        return;
      }

      return {
        authorized: Boolean(payload.authorized),
        email: String(payload.email ?? ""),
        emailVerified: Boolean(payload.emailVerified),
        id: payload.sub,
        image: (payload.image as string | null | undefined) ?? null,
        name: String(payload.name ?? ""),
      } satisfies AuthClaims;
    })
  );
