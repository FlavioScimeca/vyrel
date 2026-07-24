import { requireActorUserId } from "@vyrel/graphql/context";
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
import { getSignedDownloadUrl } from "@vyrel/storage/object-storage";

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
  organization: t.field({
    args: {
      id: t.arg.id({ required: true }),
    },
    description: metadata.organization.description,
    nullable: true,
    resolve: (_root, args, context) =>
      runOrganizationGraphqlEffect(
        getOrganization(
          organizationByIdSchema.parse({ id: String(args.id) }),
          requireActorUserId(context)
        )
      ),
    type: OrganizationObject,
  }),
  organizations: t.field({
    description: metadata.organizations.description,
    nullable: false,
    resolve: (_root, _args, context) =>
      runOrganizationGraphqlEffect(
        listOrganizations(requireActorUserId(context))
      ),
    type: [OrganizationObject],
  }),
}));
