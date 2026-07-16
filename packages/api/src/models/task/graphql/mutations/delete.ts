import { resolveActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";

import { deleteTask } from "../../services/delete.service";
import { taskDeleteSchema } from "../../types/base.types";
import { runTaskGraphqlEffect } from "../effect";

const typeOptionsMetadata = {
  description: "Delete a task in an organization the caller belongs to.",
  name: "DeleteTask",
};

builder.mutationFields((t) => ({
  deleteTask: t.fieldWithInput({
    input: {
      taskId: t.input.string({ required: true }),
    },
    resolve: (_root, args, context) =>
      runTaskGraphqlEffect(
        deleteTask(
          taskDeleteSchema.parse(args.input),
          context.headers,
          resolveActorUserId(context)
        )
      ),
    type: "String",
    typeOptions: typeOptionsMetadata,
  }),
}));
