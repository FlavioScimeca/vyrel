import { requireActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";

import { deleteTaskLabel } from "../../services/label.service";
import { taskLabelDeleteSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { taskLabelGraphql } from "../task.query";

builder.mutationFields((t) => ({
  deleteTaskLabel: t.fieldWithInput({
    input: {
      ...taskLabelGraphql.inputsFrom(taskLabelDeleteSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        deleteTaskLabel(
          taskLabelDeleteSchema.parse(args.input),
          requireActorUserId(context)
        )
      ),
    type: "String",
    typeOptions: {
      description: "Delete an organization task label.",
      name: "DeleteTaskLabel",
    },
  }),
}));
