import { requireActorEffect } from "@vyrel/graphql/context";
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
import { Effect } from "effect";
import { z } from "zod/v4";

import { getSignedOrganizationImageUrl } from "../services/logo.service";
import { getOrganization, listOrganizations } from "../services/read.service";
import { organizationQuerySchema } from "../types/base.types";
import { organizationByIdSchema } from "../types/extra.types";
import { runOrganizationGraphqlEffect } from "./effect";

const metadata = {
  description: "Organization model",
  objectName: "Organization",
  organization: {
    description: "Get an organization by id",
  },
  organizations: {
    description: "List organizations for the authenticated user",
  },
};

export const organizationGraphql = graphqlBridge.model({
  objectName: metadata.objectName,
  rowSchema: organizationQuerySchema,
});

export const OrganizationObject = builder.drizzleObject("organization", {
  description: metadata.description,
  fields: (t) => ({
    ...organizationGraphql.exposeFields(t, {
      exclude: [],
    }),
    imageFull: t.field({
      nullable: true,
      resolve: (row) =>
        runOrganizationGraphqlEffect(
          getSignedOrganizationImageUrl(row.imageFull),
          { kind: "query", operation: "Organization.imageFull" }
        ),
      type: "String",
    }),
    imageThumb: t.field({
      nullable: true,
      resolve: (row) =>
        runOrganizationGraphqlEffect(
          getSignedOrganizationImageUrl(row.imageThumb),
          { kind: "query", operation: "Organization.imageThumb" }
        ),
      type: "String",
    }),
  }),
  name: metadata.objectName,
});

builder.queryFields((t) => ({
  organization: t.field({
    args: {
      id: t.arg.id({
        required: true,
        validate: z.string().min(1),
      }),
    },
    description: metadata.organization.description,
    nullable: true,
    resolve: (_root, args, context) =>
      runOrganizationGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(organizationByIdSchema, {
            id: String(args.id),
          });
          return yield* getOrganization(input, actorUserId);
        }),
        { kind: "query", operation: "organization" }
      ),
    type: OrganizationObject,
  }),
  organizations: t.field({
    description: metadata.organizations.description,
    nullable: false,
    resolve: (_root, _args, context) =>
      runOrganizationGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          return yield* listOrganizations(actorUserId);
        }),
        { kind: "query", operation: "organizations" }
      ),
    type: [OrganizationObject],
  }),
}));
