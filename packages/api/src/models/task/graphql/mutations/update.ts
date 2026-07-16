import { resolveActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { Effect } from "effect";

import { updateTask } from "../../services/update.service";
import { taskUpdateSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { TaskObject, taskGraphql } from "../task.query";

const typeOptionsMetadata = {
  description: "Update a task in an organization the caller belongs to.",
  name: "UpdateTask",
};

builder.mutationFields((t) => ({
  updateTask: t.fieldWithInput({
    input: {
      ...taskGraphql.inputsFrom(taskUpdateSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.sync(() => ({
          headers: context.headers,
          input: taskUpdateSchema.parse(args.input),
        })).pipe(
          Effect.flatMap(({ input, headers }) =>
            updateTask(input, headers, resolveActorUserId(context))
          )
        )
      ),
    type: TaskObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
