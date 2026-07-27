import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
import { Effect } from "effect";

import { updateTaskLabel } from "../../services/label.service";
import { taskLabelUpdateSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { TaskLabelObject, taskGraphql } from "../task.query";

builder.mutationFields((t) => ({
  updateTaskLabel: t.fieldWithInput({
    input: {
      ...taskGraphql.label.inputsFrom(taskLabelUpdateSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(
            taskLabelUpdateSchema,
            args.input
          );
          return yield* updateTaskLabel(input, actorUserId);
        }),
        { kind: "mutation", operation: "updateTaskLabel" }
      ),
    type: TaskLabelObject,
    typeOptions: {
      description: "Update an organization task label.",
      name: "UpdateTaskLabel",
    },
  }),
}));
