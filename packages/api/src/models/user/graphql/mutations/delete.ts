import { resolveActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { z } from "zod/v4";

import { deleteUser } from "../../services/delete.service";
import { userDeleteSchema } from "../../types/base.types";
import { runUserGraphqlEffect } from "../effect";

const typeOptionsMetadata = {
  description: "Delete the current authenticated user account.",
  name: "DeleteUser",
};

builder.mutationFields((t) => ({
  deleteUser: t.fieldWithInput({
    input: {
      callbackURL: t.input.string({ required: false }),
      password: t.input.string({
        required: false,
        validate: z.string().min(1).optional(),
      }),
      token: t.input.string({ required: false }),
    },
    resolve: (_root, args, context) =>
      runUserGraphqlEffect(
        deleteUser(
          userDeleteSchema.parse(args.input),
          context.headers,
          resolveActorUserId(context)
        )
      ),
    type: "String",
    typeOptions: typeOptionsMetadata,
  }),
}));
