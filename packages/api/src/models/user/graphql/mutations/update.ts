import { requireActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { Effect } from "effect";

import { updateUser } from "../../services/update.service";
import { userUpdateSchema } from "../../types/base.types";
import { runUserGraphqlEffect } from "../effect";
import { UserObject, userGraphql } from "../user.query";

const typeOptionsMetadata = {
  description: "Update the current authenticated user profile.",
  name: "UpdateUser",
};

builder.mutationFields((t) => ({
  updateUser: t.fieldWithInput({
    input: {
      ...userGraphql.inputsFrom(userUpdateSchema),
    },
    resolve: (_root, args, context) =>
      runUserGraphqlEffect(
        Effect.sync(() => ({
          actorUserId: requireActorUserId(context),
          headers: context.headers,
          input: userUpdateSchema.parse(args.input),
        })).pipe(
          Effect.flatMap(({ actorUserId, headers, input }) =>
            updateUser(input, headers, actorUserId)
          )
        )
      ),
    type: UserObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
