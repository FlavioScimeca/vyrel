import { requireActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";

import { createTaskLabel } from "../../services/label.service";
import { taskLabelCreateSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";
import { TaskLabelObject, taskLabelGraphql } from "../task.query";

builder.mutationFields((t) => ({
  createTaskLabel: t.fieldWithInput({
    input: {
      ...taskLabelGraphql.inputsFrom(taskLabelCreateSchema),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        createTaskLabel(
          taskLabelCreateSchema.parse(args.input),
          requireActorUserId(context)
        ),
        { mutation: "createTaskLabel" }
      ),
    type: TaskLabelObject,
    typeOptions: {
      description: "Create a reusable label in an organization.",
      name: "CreateTaskLabel",
    },
  }),
}));
