import { member, organization } from "@vyrel/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "../../../effect/infrastructure/database.service";
import { OrganizationRepositoryError } from "../utils/errors";

type OrganizationRow = typeof organization.$inferSelect;

const repositoryError = (message: string, cause: unknown) =>
  new OrganizationRepositoryError({ cause, message });

export class OrganizationRepository extends Effect.Service<OrganizationRepository>()(
  "@vyrel/api/models/organization/services/organization.repository/OrganizationRepository",
  {
    dependencies: [Database.Default],
    effect: Effect.gen(function* () {
      const { client } = yield* Database;

      return {
        findById: (id: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to load organization.", cause),
            try: () =>
              client
                .select()
                .from(organization)
                .where(eq(organization.id, id))
                .get() as Promise<OrganizationRow | undefined>,
          }),

        findMembership: (organizationId: string, userId: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError(
                "Unable to verify organization membership.",
                cause
              ),
            try: () =>
              client
                .select({ id: member.id })
                .from(member)
                .where(
                  and(
                    eq(member.organizationId, organizationId),
                    eq(member.userId, userId)
                  )
                )
                .get(),
          }),

        listForUser: (actorUserId: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to load organizations.", cause),
            try: () =>
              client
                .select({ organization })
                .from(organization)
                .innerJoin(member, eq(member.organizationId, organization.id))
                .where(eq(member.userId, actorUserId))
                .all()
                .then((records) => records.map((row) => row.organization)),
          }),
      } as const;
    }),
  }
) {}
