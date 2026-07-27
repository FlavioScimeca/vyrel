import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import {
  parseArgsEffect,
  withZodValidation,
} from "@vyrel/graphql/utils/zod-pothos-validation";
import { Effect } from "effect";
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
    input: withZodValidation(
      {
        callbackURL: t.input.string({ required: false }),
        password: t.input.string({
          required: false,
          validate: z.string().min(1).optional(),
        }),
        token: t.input.string({ required: false }),
      },
      userDeleteSchema
    ),
    resolve: (_root, args, context) =>
      runUserGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(userDeleteSchema, args.input);
          return yield* deleteUser(input, context.headers, actorUserId);
        }),
        { kind: "mutation", operation: "deleteUser" }
      ),
    type: "String",
    typeOptions: typeOptionsMetadata,
  }),
}));
