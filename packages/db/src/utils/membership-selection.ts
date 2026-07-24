import { Option } from "effect";

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
  const currentId = Option.fromNullable(currentActiveOrganizationId).pipe(
    Option.filter((organizationId) => organizationId.length > 0)
  );

  if (
    Option.isSome(currentId) &&
    memberships.some(({ organizationId }) => organizationId === currentId.value)
  ) {
    return currentId.value;
  }

  const [firstMembership] = [...memberships].sort(
    (left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() ||
      compareIds(left.id, right.id)
  );

  return firstMembership?.organizationId ?? null;
}
