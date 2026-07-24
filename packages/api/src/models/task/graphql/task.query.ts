import { db } from "@vyrel/db";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type task,
  taskLabel,
  taskLabelAssignment,
  user,
} from "@vyrel/db/schema";
import { requireActorUserId } from "@vyrel/graphql/context";
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { getSignedDownloadUrl } from "@vyrel/storage/object-storage";
import { eq } from "drizzle-orm";

import { UserObject } from "../../user/graphql/user.query";
import { listTaskLabels } from "../services/label.service";
import {
  getTask,
  getTaskSummary,
  listTaskConnection,
  listTasksByOrganization,
} from "../services/read.service";
import { taskLabelQuerySchema, taskQuerySchema } from "../types/base.types";
import {
  TASK_SORTS,
  taskByIdSchema,
  taskConnectionSchema,
  taskListGraphqlFiltersSchema,
  tasksByOrganizationSchema,
} from "../types/extra.types";
import { runTaskGraphqlEffect } from "./effect";

const metadata = {
  description: "Task model",
  objectName: "Task",
  task: {
    description: "Get a task by id",
  },
  tasks: {
    description: "List tasks for an organization the caller belongs to",
  },
};

export const TaskStatusEnum = builder.enumType("TaskStatus", {
  values: TASK_STATUSES,
});

export const TaskPriorityEnum = builder.enumType("TaskPriority", {
  values: TASK_PRIORITIES,
});

export const TaskSortEnum = builder.enumType("TaskSort", {
  values: TASK_SORTS,
});

export const taskGraphql = graphqlBridge.model({
  listArgsSchema: {
    filters: taskListGraphqlFiltersSchema,
  },
  objectName: metadata.objectName,
  rowSchema: taskQuerySchema,
});

export const taskLabelGraphql = graphqlBridge.model({
  objectName: "TaskLabel",
  rowSchema: taskLabelQuerySchema,
});

export const TaskLabelObject = builder.drizzleObject("taskLabel", {
  description: "A reusable organization-scoped task label.",
  fields: (t) => ({
    ...taskLabelGraphql.exposeFields(t, { exclude: [] }),
  }),
  name: "TaskLabel",
});

export const TaskObject = builder.drizzleObject("task", {
  description: metadata.description,
  fields: (t) => ({
    ...taskGraphql.exposeFields(t, {
      exclude: ["dueDate"],
    }),
    assignee: t.field({
      nullable: true,
      resolve: (row) => {
        if (row.assigneeId === null) {
          return null;
        }
        return db.select().from(user).where(eq(user.id, row.assigneeId)).get();
      },
      type: UserObject,
    }),
    dueDate: t.field({
      nullable: true,
      resolve: (row) => row.dueDate,
      type: "LocalDate",
    }),
    imageFull: t.field({
      nullable: true,
      resolve: (row) => {
        if (row.imageFull === null) {
          return;
        }
        return getSignedDownloadUrl(row.imageFull);
      },
      type: "String",
    }),
    imageThumb: t.field({
      nullable: true,
      resolve: (row) => {
        if (row.imageThumb === null) {
          return;
        }
        return getSignedDownloadUrl(row.imageThumb);
      },
      type: "String",
    }),
    labels: t.field({
      nullable: false,
      resolve: (row) =>
        db
          .select({
            color: taskLabel.color,
            createdAt: taskLabel.createdAt,
            id: taskLabel.id,
            name: taskLabel.name,
            organizationId: taskLabel.organizationId,
          })
          .from(taskLabelAssignment)
          .innerJoin(taskLabel, eq(taskLabel.id, taskLabelAssignment.labelId))
          .where(eq(taskLabelAssignment.taskId, row.id))
          .all(),
      type: [TaskLabelObject],
    }),
  }),
  name: metadata.objectName,
});

type TaskConnectionShape = {
  nodes: (typeof task.$inferSelect)[];
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
};

const TaskPageInfoObject = builder
  .objectRef<TaskConnectionShape["pageInfo"]>("TaskPageInfo")
  .implement({
    fields: (t) => ({
      endCursor: t.exposeString("endCursor", { nullable: true }),
      hasNextPage: t.exposeBoolean("hasNextPage", { nullable: false }),
    }),
  });

const TaskConnectionObject = builder
  .objectRef<TaskConnectionShape>("TaskConnection")
  .implement({
    fields: (t) => ({
      nodes: t.field({
        nullable: false,
        resolve: (connection) => connection.nodes,
        type: [TaskObject],
      }),
      pageInfo: t.field({
        nullable: false,
        resolve: (connection) => connection.pageInfo,
        type: TaskPageInfoObject,
      }),
    }),
  });

type TaskSummaryShape = {
  done: number;
  inProgress: number;
  overdue: number;
  todo: number;
  total: number;
};

const TaskSummaryObject = builder
  .objectRef<TaskSummaryShape>("TaskSummary")
  .implement({
    fields: (t) => ({
      done: t.exposeInt("done", { nullable: false }),
      inProgress: t.exposeInt("inProgress", { nullable: false }),
      overdue: t.exposeInt("overdue", { nullable: false }),
      todo: t.exposeInt("todo", { nullable: false }),
      total: t.exposeInt("total", { nullable: false }),
    }),
  });

builder.queryFields((t) => ({
  task: t.field({
    args: {
      id: t.arg.id({ required: true }),
    },
    description: metadata.task.description,
    nullable: true,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        getTask(
          taskByIdSchema.parse({ id: String(args.id) }),
          requireActorUserId(context)
        )
      ),
    type: TaskObject,
  }),
  tasks: t.field({
    args: {
      labelIds: t.arg.stringList(),
      organizationId: t.arg.id({ required: true }),
      priorities: t.arg({
        type: [TaskPriorityEnum],
      }),
      statuses: t.arg({
        type: [TaskStatusEnum],
      }),
      ...taskGraphql.args.filters,
    },
    description: metadata.tasks.description,
    nullable: false,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        listTasksByOrganization(
          tasksByOrganizationSchema.parse({
            ...args,
            organizationId: String(args.organizationId),
          }),
          requireActorUserId(context)
        )
      ),
    type: [TaskObject],
  }),
  taskConnection: t.field({
    args: {
      after: t.arg.string(),
      first: t.arg.int(),
      labelIds: t.arg.stringList(),
      organizationId: t.arg.id({ required: true }),
      priorities: t.arg({
        type: [TaskPriorityEnum],
      }),
      statuses: t.arg({
        type: [TaskStatusEnum],
      }),
      ...taskGraphql.args.filters,
    },
    description:
      "List tasks using an opaque cursor and deterministic ordering.",
    nullable: false,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        listTaskConnection(
          taskConnectionSchema.parse({
            ...args,
            organizationId: String(args.organizationId),
          }),
          requireActorUserId(context)
        )
      ),
    type: TaskConnectionObject,
  }),
  taskLabels: t.field({
    args: {
      organizationId: t.arg.id({ required: true }),
    },
    nullable: false,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        listTaskLabels(String(args.organizationId), requireActorUserId(context))
      ),
    type: [TaskLabelObject],
  }),
  taskSummary: t.field({
    args: {
      organizationId: t.arg.id({ required: true }),
    },
    nullable: false,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        getTaskSummary(String(args.organizationId), requireActorUserId(context))
      ),
    type: TaskSummaryObject,
  }),
}));
