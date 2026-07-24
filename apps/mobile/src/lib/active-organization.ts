import type { SessionData } from "@/lib/auth-client";

/** Active org id from Better Auth organization plugin session fields. */
export function getActiveOrganizationId(
  session: SessionData | null | undefined
): string | null {
  if (session === null || session === undefined) {
    return null;
  }

  const value = (
    session.session as { activeOrganizationId?: string | null } | undefined
  )?.activeOrganizationId;

  return typeof value === "string" && value.length > 0 ? value : null;
}
