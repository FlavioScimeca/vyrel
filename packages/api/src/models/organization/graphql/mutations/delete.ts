import { requireActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";

import { deleteOrganization } from "../../services/delete.service";
import { organizationDeleteSchema } from "../../types/base.types";
import { runOrganizationGraphqlEffect } from "../effect";

const typeOptionsMetadata = {
  description: "Delete an organization the caller belongs to.",
  name: "DeleteOrganization",
};

builder.mutationFields((t) => ({
  deleteOrganization: t.fieldWithInput({
    input: {
      organizationId: t.input.string({ required: true }),
    },
    resolve: (_root, args, context) =>
      runOrganizationGraphqlEffect(
        deleteOrganization(
          organizationDeleteSchema.parse(args.input),
          context.headers,
          requireActorUserId(context)
        )
      ),
    type: "String",
    typeOptions: typeOptionsMetadata,
  }),
}));
