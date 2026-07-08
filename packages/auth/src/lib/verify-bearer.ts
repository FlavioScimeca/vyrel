import { env } from "@vyrel/env/server";
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

/** Must match `betterAuth({ baseURL })` — used as JWT `iss` / `aud`. */
const issuerAudience = env.BETTER_AUTH_URL;

export async function verifyBearer(
  headers: Headers
): Promise<AuthClaims | undefined> {
  const h = headers.get("authorization");
  if (!h?.startsWith("Bearer ")) {
    return;
  }
  const token = h.slice(7).trim();
  if (!token) {
    return;
  }

  try {
    const jwks = await getJwks();
    const { payload } = await jwtVerify(token, jwks, {
      audience: issuerAudience,
      issuer: issuerAudience,
    });
    if (!payload.sub) {
      return;
    }
    return {
      authorized: Boolean(payload.authorized),
      email: String(payload.email ?? ""),
      emailVerified: Boolean(payload.emailVerified),
      id: payload.sub,
      image: (payload.image as string | null | undefined) ?? null,
      name: String(payload.name ?? ""),
    };
  } catch (error) {
    console.error(error);
  }
}
