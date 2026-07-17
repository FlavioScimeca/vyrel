import { JWT_EXPIRATION_TIME } from "@vyrel/consts/server";
import { db } from "@vyrel/db";
import {
  account,
  invitation,
  jwks,
  member,
  organization,
  session,
  user,
  verification,
} from "@vyrel/db/schema";
import { env } from "@vyrel/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization as organizationPlugin } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";

import { VerifyEmail } from "./emails/verify-email";
import { sendEmail } from "./lib/email";

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
    },
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: {
      account,
      invitation,
      jwks,
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
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: ({ user: authUser, url }) => {
      // Start send without awaiting so Better Auth can return immediately.
      sendEmail({
        react: VerifyEmail({
          username: authUser.name,
          verifyUrl: url,
        }),
        subject: "Verify your email",
        to: authUser.email,
      }).catch(() => undefined);
      return Promise.resolve();
    },
  },
  plugins: [
    organizationPlugin({
      schema: {
        organization: {
          additionalFields: {
            imageAssetId: {
              required: false,
              type: "string",
            },
            imageFull: {
              required: false,
              type: "string",
            },
            imagePlaceholder: {
              required: false,
              type: "string",
            },
            imageThumb: {
              required: false,
              type: "string",
            },
          },
        },
      },
    }),
    jwt({
      jwt: {
        expirationTime: JWT_EXPIRATION_TIME,
      },
    }),
  ],
  trustedOrigins: [env.CORS_ORIGIN],
  user: {
    additionalFields: {
      imageAssetId: {
        required: false,
        type: "string",
      },
      imageFull: {
        required: false,
        type: "string",
      },
      imagePlaceholder: {
        required: false,
        type: "string",
      },
      imageThumb: {
        required: false,
        type: "string",
      },
    },
  },
});
