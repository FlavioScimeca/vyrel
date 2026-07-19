import { resolveActorUserId } from "@vyrel/graphql/context";
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { getSignedDownloadUrl } from "@vyrel/storage/object-storage";

import { getTask, listTasksByOrganization } from "../services/read.service";
import { taskQuerySchema } from "../types/base.types";
import {
  taskByIdSchema,
  taskListFiltersSchema,
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

export const taskGraphql = graphqlBridge.model({
  listArgsSchema: {
    filters: taskListFiltersSchema,
  },
  objectName: metadata.objectName,
  rowSchema: taskQuerySchema,
});

export const TaskObject = builder.drizzleObject("task", {
  description: metadata.description,
  fields: (t) => ({
    ...taskGraphql.exposeFields(t, {
      exclude: [],
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
  }),
  name: metadata.objectName,
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
          context.headers,
          resolveActorUserId(context)
        )
      ),
    type: TaskObject,
  }),
  tasks: t.field({
    args: {
      organizationId: t.arg.id({ required: true }),
      ...taskGraphql.args.filters,
    },
    description: metadata.tasks.description,
    nullable: false,
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        listTasksByOrganization(
          tasksByOrganizationSchema.parse({
            createdFrom: args.createdFrom ?? undefined,
            createdTo: args.createdTo ?? undefined,
            organizationId: String(args.organizationId),
            search: args.search ?? undefined,
          }),
          context.headers,
          resolveActorUserId(context)
        )
      ),
    type: [TaskObject],
  }),
}));
