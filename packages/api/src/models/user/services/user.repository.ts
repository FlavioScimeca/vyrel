import { user as userTable } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "../../../effect/infrastructure/database.service";
import { UserRepositoryError } from "../utils/errors";

type UserRow = typeof userTable.$inferSelect;

const repositoryError = (message: string, cause: unknown) =>
  new UserRepositoryError({ cause, message });

export class UserRepository extends Effect.Service<UserRepository>()(
  "@vyrel/api/models/user/services/user.repository/UserRepository",
  {
    dependencies: [Database.Default],
    effect: Effect.gen(function* () {
      const { client } = yield* Database;

      return {
        findById: (id: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to load current user.", cause),
            try: () =>
              client
                .select()
                .from(userTable)
                .where(eq(userTable.id, id))
                .get() as Promise<UserRow | undefined>,
          }),
      } as const;
    }),
  }
) {}
