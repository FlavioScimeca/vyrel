import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
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
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(userUpdateSchema, args.input);
          return yield* updateUser(input, context.headers, actorUserId);
        }),
        { kind: "mutation", operation: "updateUser" }
      ),
    type: UserObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
