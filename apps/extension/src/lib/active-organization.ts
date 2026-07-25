/** Active org id from Better Auth organization plugin session fields. */
export function getActiveOrganizationId(
  session:
    | {
        session?: { activeOrganizationId?: string | null };
      }
    | null
    | undefined
): string | null {
  if (session === null || session === undefined) {
    return null;
  }

  const value = session.session?.activeOrganizationId;
  return typeof value === "string" && value.length > 0 ? value : null;
}
