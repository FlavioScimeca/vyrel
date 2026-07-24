import { env } from "@vyrel/env/server";

type SessionWithVerification = {
  user: {
    emailVerified: boolean;
  };
};

export function onlyVerifiedSession<T extends SessionWithVerification>(
  session: T | null
): T | null {
  if (session === null) {
    return null;
  }

  if (env.NODE_ENV === "development") {
    return session;
  }

  return session.user.emailVerified === true ? session : null;
}
