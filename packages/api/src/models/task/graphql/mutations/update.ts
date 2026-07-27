import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
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
      ...taskGraphql.task.inputsFrom(taskUpdateSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(taskUpdateSchema, args.input);
          return yield* updateTask(input, actorUserId);
        }),
        { kind: "mutation", operation: "updateTask" }
      ),
    type: TaskObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
