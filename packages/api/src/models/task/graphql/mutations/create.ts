import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
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
    // Morph inputsFrom already attaches Zod validate for ValidationPlugin.
    input: {
      ...taskGraphql.task.inputsFrom(taskCreateSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(taskCreateSchema, args.input);
          return yield* createTask(input, actorUserId);
        }),
        { kind: "mutation", operation: "createTask" }
      ),
    type: TaskObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
