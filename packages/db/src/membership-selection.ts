export type OrganizationMembershipIdentity = {
  createdAt: Date;
  id: string;
  organizationId: string;
};

function compareIds(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

export function selectActiveOrganizationId(
  memberships: readonly OrganizationMembershipIdentity[],
  currentActiveOrganizationId: string | null | undefined
): string | null {
  if (
    currentActiveOrganizationId &&
    memberships.some(
      ({ organizationId }) => organizationId === currentActiveOrganizationId
    )
  ) {
    return currentActiveOrganizationId;
  }

  const [firstMembership] = [...memberships].sort(
    (left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() ||
      compareIds(left.id, right.id)
  );

  return firstMembership?.organizationId ?? null;
}
