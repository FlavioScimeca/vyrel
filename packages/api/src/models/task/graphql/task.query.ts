import { db } from "@vyrel/db";
import { user } from "@vyrel/db/schema";
import { requireActorUserId } from "@vyrel/graphql/context";
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { getSignedDownloadUrl } from "@vyrel/storage/object-storage";
import { eq } from "drizzle-orm";

import { UserObject } from "../../user/graphql/user.query";
import { listLabelsForTask, listTaskLabels } from "../services/label.service";
import {
  getTask,
  getTaskSummary,
  listTaskConnection,
  listTasksByOrganization,
} from "../services/read.service";
import { taskLabelQuerySchema, taskQuerySchema } from "../types/base.types";
import {
  type TaskSummary,
  taskByIdSchema,
  taskConnectionArgsSchema,
  taskConnectionSchema,
  taskListArgsSchema,
  taskSummarySchema,
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

export const taskGraphql = {
  task: graphqlBridge.model({
    idFields: ["id", "organizationId", "assigneeId", "createdById"],
    listArgsSchema: {
      connection: taskConnectionArgsSchema,
      list: taskListArgsSchema,
    },
    objectName: "Task",
    rowSchema: taskQuerySchema,
  }),
  label: graphqlBridge.model({
    idFields: ["id", "organizationId"],
    objectName: "TaskLabel",
    rowSchema: taskLabelQuerySchema,
  }),
  summary: graphqlBridge.model({
    objectName: "TaskSummary",
    rowSchema: taskSummarySchema,
  }),
};

export const TaskLabelObject = builder.drizzleObject("taskLabel", {
  description: "A reusable organization-scoped task label.",
  fields: (t) => ({
    ...taskGraphql.label.exposeFields(t),
  }),
  name: "TaskLabel",
});

export const TaskObject = builder.drizzleObject("task", {
  name: metadata.objectName,
  description: metadata.description,

  fields: (t) => ({
    ...taskGraphql.task.exposeFields(t),
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
      resolve: (row) => runTaskGraphqlEffect(listLabelsForTask(row.id)),
      type: [TaskLabelObject],
    }),
  }),
});

const TaskConnectionObject = taskGraphql.task.connection({ type: TaskObject });

const TaskSummaryObject = builder
  .objectRef<TaskSummary>("TaskSummary")
  .implement({
    fields: (t) => ({
      ...taskGraphql.summary.exposeFields(t),
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
      ...taskGraphql.task.args.list,
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
      ...taskGraphql.task.args.connection,
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
