import { requireActorEffect } from "@vyrel/graphql/context";
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
import { Effect } from "effect";
import { z } from "zod/v4";

import { UserObject } from "../../user/graphql/user.query";
import { getSignedTaskImageUrl } from "../services/image.service";
import { listLabelsForTask, listTaskLabels } from "../services/label.service";
import {
  getTask,
  getTaskAssignee,
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
      resolve: (row) =>
        runTaskGraphqlEffect(getTaskAssignee(row.assigneeId), {
          kind: "query",
          operation: "Task.assignee",
        }),
      type: UserObject,
    }),
    imageFull: t.field({
      nullable: true,
      resolve: (row) =>
        runTaskGraphqlEffect(getSignedTaskImageUrl(row.imageFull), {
          kind: "query",
          operation: "Task.imageFull",
        }),
      type: "String",
    }),
    imageThumb: t.field({
      nullable: true,
      resolve: (row) =>
        runTaskGraphqlEffect(getSignedTaskImageUrl(row.imageThumb), {
          kind: "query",
          operation: "Task.imageThumb",
        }),
      type: "String",
    }),
    labels: t.field({
      nullable: false,
      resolve: (row) =>
        runTaskGraphqlEffect(listLabelsForTask(row.id), {
          kind: "query",
          operation: "Task.labels",
        }),
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

const organizationIdArgSchema = z.object({
  organizationId: z.string().min(1),
});

builder.queryFields((t) => ({
  task: t.field({
    args: {
      id: t.arg.id({
        required: true,
        validate: z.string().min(1),
      }),
    },
    description: metadata.task.description,
    nullable: true,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(taskByIdSchema, {
            id: String(args.id),
          });
          return yield* getTask(input, actorUserId);
        }),
        { kind: "query", operation: "task" }
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
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(tasksByOrganizationSchema, {
            ...args,
            organizationId: String(args.organizationId),
          });
          return yield* listTasksByOrganization(input, actorUserId);
        }),
        { kind: "query", operation: "tasks" }
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
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(taskConnectionSchema, {
            ...args,
            organizationId: String(args.organizationId),
          });
          return yield* listTaskConnection(input, actorUserId);
        }),
        { kind: "query", operation: "taskConnection" }
      ),
    type: TaskConnectionObject,
  }),
  taskLabels: t.field({
    args: {
      organizationId: t.arg.id({
        required: true,
        validate: z.string().min(1),
      }),
    },
    nullable: false,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const { organizationId } = yield* parseArgsEffect(
            organizationIdArgSchema,
            { organizationId: String(args.organizationId) }
          );
          return yield* listTaskLabels(organizationId, actorUserId);
        }),
        { kind: "query", operation: "taskLabels" }
      ),
    type: [TaskLabelObject],
  }),
  taskSummary: t.field({
    args: {
      organizationId: t.arg.id({
        required: true,
        validate: z.string().min(1),
      }),
    },
    nullable: false,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const { organizationId } = yield* parseArgsEffect(
            organizationIdArgSchema,
            { organizationId: String(args.organizationId) }
          );
          return yield* getTaskSummary(organizationId, actorUserId);
        }),
        { kind: "query", operation: "taskSummary" }
      ),
    type: TaskSummaryObject,
  }),
}));
