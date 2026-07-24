import { asc, eq } from "drizzle-orm";

import { db } from "./index";
import type { OrganizationMembershipIdentity } from "./membership-selection";
import { member } from "./schemas/organization.schema";

export async function listOrganizationMembershipIdentities(
  userId: string
): Promise<OrganizationMembershipIdentity[]> {
  return await db
    .select({
      createdAt: member.createdAt,
      id: member.id,
      organizationId: member.organizationId,
    })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt), asc(member.id));
}
