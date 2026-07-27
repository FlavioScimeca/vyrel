import { member } from "@vyrel/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "../infrastructure/database.service";

export class MembershipRepository extends Effect.Service<MembershipRepository>()(
  "MembershipRepository",
  {
    dependencies: [Database.Default],
    effect: Effect.gen(function* () {
      const database = yield* Database;

      const findMembership = (organizationId: string, userId: string) =>
        Effect.tryPromise({
          catch: (cause) => cause,
          try: () =>
            database.client
              .select({ id: member.id, role: member.role })
              .from(member)
              .where(
                and(
                  eq(member.organizationId, organizationId),
                  eq(member.userId, userId)
                )
              )
              .get(),
        });

      return {
        findMembership,
        findMembershipRole: (organizationId: string, userId: string) =>
          findMembership(organizationId, userId).pipe(
            Effect.map((record) => record?.role ?? null)
          ),
        isMember: (organizationId: string, userId: string) =>
          findMembership(organizationId, userId).pipe(
            Effect.map((record) => record !== undefined)
          ),
      } as const;
    }),
  }
) {}
