import { resolveActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { Effect } from "effect";

import { createTask } from "../../services/create.service";
import { taskCreateSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { TaskObject, taskGraphql } from "../task.query";

const typeOptionsMetadata = {
  description: "Create a task in an organization the caller belongs to.",
  name: "CreateTask",
};

builder.mutationFields((t) => ({
  createTask: t.fieldWithInput({
    input: {
      ...taskGraphql.inputsFrom(taskCreateSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.sync(() => ({
          headers: context.headers,
          input: taskCreateSchema.parse(args.input),
        })).pipe(
          Effect.flatMap(({ input, headers }) =>
            createTask(input, headers, resolveActorUserId(context))
          )
        )
      ),
    type: TaskObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
