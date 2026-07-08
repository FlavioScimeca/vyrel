import { JWT_EXPIRATION_TIME } from "@vyrel/consts/server";
import { db } from "@vyrel/db";
import {
  account,
  invitation,
  member,
  organization,
  session,
  user,
  verification,
} from "@vyrel/db/schemas/auth.schema";
import { env } from "@vyrel/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization as organizationPlugin } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    },
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: {
      account,
      invitation,
      member,
      organization,
      session,
      user,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organizationPlugin(),
    jwt({
      jwt: {
        expirationTime: JWT_EXPIRATION_TIME,
      },
    }),
  ],
  trustedOrigins: [env.CORS_ORIGIN],
});
