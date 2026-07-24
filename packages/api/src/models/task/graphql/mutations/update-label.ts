import { requireActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";

import { updateTaskLabel } from "../../services/label.service";
import { taskLabelUpdateSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { TaskLabelObject, taskLabelGraphql } from "../task.query";

builder.mutationFields((t) => ({
  updateTaskLabel: t.fieldWithInput({
    input: {
      ...taskLabelGraphql.inputsFrom(taskLabelUpdateSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        updateTaskLabel(
          taskLabelUpdateSchema.parse(args.input),
          requireActorUserId(context)
        )
      ),
    type: TaskLabelObject,
    typeOptions: {
      description: "Update an organization task label.",
      name: "UpdateTaskLabel",
    },
  }),
}));
