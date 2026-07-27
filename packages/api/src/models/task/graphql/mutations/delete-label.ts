import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { Effect } from "effect";

import { deleteTaskLabel } from "../../services/label.service";
import { taskLabelDeleteSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { taskGraphql } from "../task.query";

builder.mutationFields((t) => ({
  deleteTaskLabel: t.fieldWithInput({
    input: {
      ...taskGraphql.label.inputsFrom(taskLabelDeleteSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          return yield* deleteTaskLabel(args.input, actorUserId);
        }),
        { kind: "mutation", operation: "deleteTaskLabel" }
      ),
    type: "String",
    typeOptions: {
      description: "Delete an organization task label.",
      name: "DeleteTaskLabel",
    },
  }),
}));
