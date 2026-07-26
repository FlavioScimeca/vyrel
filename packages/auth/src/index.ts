import { expo } from "@better-auth/expo";
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
import { selectActiveOrganizationId } from "@vyrel/db/utils/membership-selection";
import { listOrganizationMembershipIdentities } from "@vyrel/db/utils/organization-memberships";
import { env } from "@vyrel/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization as organizationPlugin } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { OrganizationInvitation } from "./emails/organization-invitation";
import { ResetPassword } from "./emails/reset-password";
import { VerifyEmail } from "./emails/verify-email";
import { sendEmail } from "./lib/email";
import { getExtensionTrustedOrigins } from "./lib/extension-origins";

const isDevelopment = env.NODE_ENV === "development";

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
  databaseHooks: {
    session: {
      create: {
        before: async (sessionRecord) => {
          const authUser = await db
            .select({ emailVerified: user.emailVerified })
            .from(user)
            .where(eq(user.id, sessionRecord.userId))
            .get();

          if (!isDevelopment && authUser?.emailVerified !== true) {
            return false;
          }

          const memberships = await Effect.runPromise(
            listOrganizationMembershipIdentities(sessionRecord.userId)
          );

          return {
            data: {
              ...sessionRecord,
              activeOrganizationId: selectActiveOrganizationId(
                memberships,
                null
              ),
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !isDevelopment,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: false,
    sendResetPassword: ({ user: authUser, url }) => {
      // Start send without awaiting so Better Auth can return immediately.
      sendEmail({
        react: ResetPassword({
          resetUrl: url,
          username: authUser.name,
        }),
        subject: "Reset your password",
        to: authUser.email,
      }).catch(() => undefined);
      return Promise.resolve();
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
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
    expo(),
    organizationPlugin({
      invitationExpiresIn: 60 * 60 * 48,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: (data) => {
        const invitationUrl = `vyrel-mobile://invite/${data.id}`;
        sendEmail({
          react: OrganizationInvitation({
            invitationUrl,
            inviterName: data.inviter.user.name,
            organizationName: data.organization.name,
            role: data.role,
          }),
          subject: `Join ${data.organization.name} on Vyrel`,
          to: data.email,
        }).catch(() => undefined);
        return Promise.resolve();
      },
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
  trustedOrigins: [
    env.CORS_ORIGIN,
    "vyrel-mobile://",
    "vyrel-mobile://*",
    ...getExtensionTrustedOrigins(isDevelopment),
    ...(isDevelopment
      ? [
          // Expo Go / Metro (see Better Auth Expo docs)
          "exp://",
          "exp://**",
          "exp://192.168.*.*:*/**",
          "exp://10.*.*.*:*/**",
          // Android emulator loopback to host API
          "http://10.0.2.2:3000",
          "http://localhost:3000",
          ...(env.TAILSCALE_FUNNEL_URL === undefined
            ? []
            : [env.TAILSCALE_FUNNEL_URL]),
        ]
      : []),
  ],
  user: {
    deleteUser: {
      enabled: true,
    },
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
