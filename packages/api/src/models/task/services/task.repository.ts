import {
  member,
  task,
  taskLabel,
  taskLabelAssignment,
  user,
} from "@vyrel/db/schema";
import { and, asc, eq, inArray, type SQL, sql } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "../../../effect/infrastructure/database.service";
import { TaskRepositoryError } from "../utils/errors";

type TaskRow = typeof task.$inferSelect;
type TaskLabelRow = typeof taskLabel.$inferSelect;
type UserRow = typeof user.$inferSelect;

type CreateTaskValues = {
  assigneeId: string | null;
  createdById: string;
  description: string | null;
  dueDate: string | null;
  id: string;
  imageAssetId: string | null;
  imageFull: string | null;
  imagePlaceholder: string | null;
  imageThumb: string | null;
  labelIds: string[];
  organizationId: string;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  title: string;
};

type TaskUpdates = {
  assigneeId?: string | null;
  description?: string | null;
  dueDate?: string | null;
  imageAssetId?: string | null;
  imageFull?: string | null;
  imagePlaceholder?: string | null;
  imageThumb?: string | null;
  priority?: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  title?: string;
};

const repositoryError = (message: string, cause: unknown) =>
  new TaskRepositoryError({ cause, message });

export class TaskRepository extends Effect.Service<TaskRepository>()(
  "@vyrel/api/models/task/services/task.repository/TaskRepository",
  {
    dependencies: [Database.Default],
    effect: Effect.gen(function* () {
      const database = yield* Database;
      const { client } = database;

      return {
        createLabel: (values: {
          color: string;
          id: string;
          name: string;
          organizationId: string;
        }) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to create task label.", cause),
            try: () =>
              client.insert(taskLabel).values(values).returning().get(),
          }),

        createWithLabels: (values: CreateTaskValues) =>
          Effect.tryPromise({
            catch: (cause) => repositoryError("Unable to create task.", cause),
            try: () =>
              client.transaction((transaction) => {
                const { labelIds, ...taskValues } = values;
                let createdTask: TaskRow;

                return Promise.resolve(
                  transaction.insert(task).values(taskValues).returning().get()
                )
                  .then((result) => {
                    createdTask = result;
                    if (labelIds.length === 0) {
                      return;
                    }

                    return Promise.resolve(
                      transaction.insert(taskLabelAssignment).values(
                        labelIds.map((labelId) => ({
                          labelId,
                          taskId: values.id,
                        }))
                      )
                    );
                  })
                  .then(() => createdTask);
              }),
          }),

        deleteById: (taskId: string) =>
          Effect.tryPromise({
            catch: (cause) => repositoryError("Unable to delete task.", cause),
            try: () => client.delete(task).where(eq(task.id, taskId)).run(),
          }),

        deleteLabelById: (labelId: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to delete task label.", cause),
            try: () =>
              client.delete(taskLabel).where(eq(taskLabel.id, labelId)).run(),
          }),

        findAssigneeMembership: (organizationId: string, assigneeId: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to validate task assignee.", cause),
            try: () =>
              client
                .select({ id: member.id })
                .from(member)
                .where(
                  and(
                    eq(member.organizationId, organizationId),
                    eq(member.userId, assigneeId)
                  )
                )
                .get(),
          }),

        findById: (id: string) =>
          Effect.tryPromise({
            catch: (cause) => repositoryError("Unable to load task.", cause),
            try: () =>
              client
                .select()
                .from(task)
                .where(eq(task.id, id))
                .get() as Promise<TaskRow | undefined>,
          }),

        findLabelById: (labelId: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to load task label.", cause),
            try: () =>
              client
                .select()
                .from(taskLabel)
                .where(eq(taskLabel.id, labelId))
                .get() as Promise<TaskLabelRow | undefined>,
          }),

        findLabelsByIdsInOrganization: (
          organizationId: string,
          labelIds: string[]
        ) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to validate task labels.", cause),
            try: () =>
              client
                .select({ id: taskLabel.id })
                .from(taskLabel)
                .where(
                  and(
                    eq(taskLabel.organizationId, organizationId),
                    inArray(taskLabel.id, labelIds)
                  )
                )
                .all(),
          }),

        findLabelsForTask: (taskId: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to load labels for task.", cause),
            try: () =>
              client
                .select({
                  color: taskLabel.color,
                  createdAt: taskLabel.createdAt,
                  id: taskLabel.id,
                  name: taskLabel.name,
                  organizationId: taskLabel.organizationId,
                })
                .from(taskLabelAssignment)
                .innerJoin(
                  taskLabel,
                  eq(taskLabel.id, taskLabelAssignment.labelId)
                )
                .where(eq(taskLabelAssignment.taskId, taskId))
                .all(),
          }),

        findLabelsInOrganization: (organizationId: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to load task labels.", cause),
            try: () =>
              client
                .select()
                .from(taskLabel)
                .where(eq(taskLabel.organizationId, organizationId))
                .orderBy(asc(taskLabel.name))
                .all(),
          }),

        findUserById: (userId: string) =>
          Effect.tryPromise({
            catch: (cause) => repositoryError("Unable to load user.", cause),
            try: () =>
              client
                .select()
                .from(user)
                .where(eq(user.id, userId))
                .get() as Promise<UserRow | undefined>,
          }),

        getSummary: (organizationId: string, today: string) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to load task summary.", cause),
            try: () =>
              client
                .select({
                  done: sql<number>`sum(case when ${task.status} = 'DONE' then 1 else 0 end)`,
                  inProgress: sql<number>`sum(case when ${task.status} = 'IN_PROGRESS' then 1 else 0 end)`,
                  overdue: sql<number>`sum(case when ${task.status} != 'DONE' and ${task.dueDate} < ${today} then 1 else 0 end)`,
                  todo: sql<number>`sum(case when ${task.status} = 'TODO' then 1 else 0 end)`,
                  total: sql<number>`count(*)`,
                })
                .from(task)
                .where(eq(task.organizationId, organizationId))
                .all()
                .then(([summary]) => summary),
          }),

        list: (conditions: SQL[], orderBy: readonly SQL[], limit?: number) =>
          Effect.tryPromise({
            catch: (cause) => repositoryError("Unable to list tasks.", cause),
            try: () => {
              const query = client
                .select()
                .from(task)
                .where(and(...conditions))
                .orderBy(...orderBy);
              return limit === undefined
                ? query.all()
                : query.limit(limit).all();
            },
          }),

        updateLabel: (
          labelId: string,
          values: { color?: string; name?: string }
        ) =>
          Effect.tryPromise({
            catch: (cause) =>
              repositoryError("Unable to update task label.", cause),
            try: () =>
              client
                .update(taskLabel)
                .set(values)
                .where(eq(taskLabel.id, labelId))
                .run(),
          }),

        updateWithLabels: ({
          labelIds,
          taskId,
          updates,
        }: {
          labelIds: string[] | undefined;
          taskId: string;
          updates: TaskUpdates;
        }) =>
          Effect.tryPromise({
            catch: (cause) => repositoryError("Unable to update task.", cause),
            try: () =>
              client.transaction((transaction) => {
                const updatePromise =
                  Object.keys(updates).length > 0
                    ? Promise.resolve(
                        transaction
                          .update(task)
                          .set(updates)
                          .where(eq(task.id, taskId))
                          .run()
                      )
                    : Promise.resolve();

                return updatePromise
                  .then(() => {
                    if (labelIds === undefined) {
                      return;
                    }

                    return Promise.resolve(
                      transaction
                        .delete(taskLabelAssignment)
                        .where(eq(taskLabelAssignment.taskId, taskId))
                        .run()
                    );
                  })
                  .then(() => {
                    if (labelIds === undefined || labelIds.length === 0) {
                      return;
                    }

                    return Promise.resolve(
                      transaction.insert(taskLabelAssignment).values(
                        labelIds.map((labelId) => ({
                          labelId,
                          taskId,
                        }))
                      )
                    );
                  });
              }),
          }),
      } as const;
    }),
  }
) {}
