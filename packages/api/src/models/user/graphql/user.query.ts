import { requireActorEffect } from "@vyrel/graphql/context";
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
import { Effect } from "effect";
import { z } from "zod/v4";

import { getSignedUserImageUrl } from "../services/avatar.service";
import { getUser } from "../services/read.service";
import { userQuerySchema } from "../types/base.types";
import { userByIdSchema } from "../types/extra.types";
import { runUserGraphqlEffect } from "./effect";

const metadata = {
  currentUser: {
    description:
      "Get the authenticated user (session cookie) and their organizations",
  },
  description: "Authenticated user model",
  objectName: "User",
  user: {
    description: "Get a user by id",
  },
};

export const userGraphql = graphqlBridge.model({
  objectName: metadata.objectName,
  rowSchema: userQuerySchema,
});

export const UserObject = builder.drizzleObject("user", {
  description: metadata.description,
  fields: (t) => ({
    ...userGraphql.exposeFields(t, {
      exclude: [],
    }),
    imageFull: t.field({
      nullable: true,
      resolve: (row) =>
        runUserGraphqlEffect(getSignedUserImageUrl(row.imageFull), {
          kind: "query",
          operation: "User.imageFull",
        }),
      type: "String",
    }),
    imageThumb: t.field({
      nullable: true,
      resolve: (row) =>
        runUserGraphqlEffect(getSignedUserImageUrl(row.imageThumb), {
          kind: "query",
          operation: "User.imageThumb",
        }),
      type: "String",
    }),
  }),
  name: metadata.objectName,
});

builder.queryFields((t) => ({
  user: t.field({
    args: {
      id: t.arg.id({
        required: true,
        validate: z.string().min(1),
      }),
    },
    description: metadata.user.description,
    nullable: true,
    resolve: (_root, args, context) =>
      runUserGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(userByIdSchema, {
            id: String(args.id),
          });
          return yield* getUser(input, actorUserId);
        }),
        { kind: "query", operation: "user" }
      ),
    type: UserObject,
  }),
}));
