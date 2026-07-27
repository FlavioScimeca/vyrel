import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { Effect } from "effect";

import { deleteTask } from "../../services/delete.service";
import { taskDeleteSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { taskGraphql } from "../task.query";

const typeOptionsMetadata = {
  description: "Delete a task in an organization the caller belongs to.",
  name: "DeleteTask",
};

builder.mutationFields((t) => ({
  deleteTask: t.fieldWithInput({
    input: {
      ...taskGraphql.task.inputsFrom(taskDeleteSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          return yield* deleteTask(args.input, actorUserId);
        }),
        { kind: "mutation", operation: "deleteTask" }
      ),
    type: "String",
    typeOptions: typeOptionsMetadata,
  }),
}));
