import { asc, eq } from "drizzle-orm";
import { Data, Effect } from "effect";

import { db } from "../index";
import { member } from "../schemas/organization.schema";

export class OrganizationMembershipRepositoryError extends Data.TaggedError(
  "OrganizationMembershipRepositoryError"
)<{
  readonly cause: unknown;
  readonly message: string;
}> {}

export const listOrganizationMembershipIdentities = (userId: string) =>
  Effect.tryPromise({
    catch: (cause) =>
      new OrganizationMembershipRepositoryError({
        cause,
        message: "Unable to list organization memberships",
      }),
    try: () =>
      db
        .select({
          createdAt: member.createdAt,
          id: member.id,
          organizationId: member.organizationId,
        })
        .from(member)
        .where(eq(member.userId, userId))
        .orderBy(asc(member.createdAt), asc(member.id)),
  });
