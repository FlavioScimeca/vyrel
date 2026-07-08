import { db } from "@vyrel/db";
import { schema } from "@vyrel/db/schema/index";
import { env } from "@vyrel/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

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

    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [organization()],
  trustedOrigins: [env.CORS_ORIGIN],
});
