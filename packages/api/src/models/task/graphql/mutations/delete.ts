import { requireActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";

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
        deleteTask(
          taskDeleteSchema.parse(args.input),
          requireActorUserId(context)
        ),
        { mutation: "deleteTask" }
      ),
    type: "String",
    typeOptions: typeOptionsMetadata,
  }),
}));
