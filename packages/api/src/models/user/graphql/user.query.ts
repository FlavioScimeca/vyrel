import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { getSignedDownloadUrl } from "@vyrel/storage/object-storage";
import { getUser } from "../services/read.service";
import { userByIdSchema, userQuerySchema } from "../types/base.types";
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
      exclude: ["imageThumb", "imageFull", "printifyToken"],
    }),
    imageFull: t.field({
      nullable: true,
      resolve: (row) => {
        if (row.imageFull === null) {
          return;
        }
        return getSignedDownloadUrl(row.imageFull);
      },
      type: "String",
    }),
    imageThumb: t.field({
      nullable: true,
      resolve: (row) => {
        if (row.imageThumb === null) {
          return;
        }
        return getSignedDownloadUrl(row.imageThumb);
      },
      type: "String",
    }),
  }),
  name: metadata.objectName,
});

builder.queryFields((t) => ({
  user: t.field({
    args: {
      id: t.arg.id({ required: true }),
    },
    description: metadata.user.description,
    nullable: true,
    resolve: (_root, args, context) =>
      runUserGraphqlEffect(
        getUser(userByIdSchema.parse({ id: String(args.id) }), context.headers)
      ),
    type: UserObject,
  }),
}));
