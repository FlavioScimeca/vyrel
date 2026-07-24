import { requireActorUserId } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { Effect } from "effect";

import { updateOrganization } from "../../services/update.service";
import { organizationUpdateSchema } from "../../types/base.types";
import { runOrganizationGraphqlEffect } from "../effect";
import { OrganizationObject, organizationGraphql } from "../organization.query";

const typeOptionsMetadata = {
  description: "Update an organization the caller belongs to.",
  name: "UpdateOrganization",
};

builder.mutationFields((t) => ({
  updateOrganization: t.fieldWithInput({
    input: {
      ...organizationGraphql.inputsFrom(organizationUpdateSchema),
    },
    resolve: (_root, args, context) =>
      runOrganizationGraphqlEffect(
        Effect.sync(() => ({
          actorUserId: requireActorUserId(context),
          headers: context.headers,
          input: organizationUpdateSchema.parse(args.input),
        })).pipe(
          Effect.flatMap(({ actorUserId, headers, input }) =>
            updateOrganization(input, headers, actorUserId)
          )
        )
      ),
    type: OrganizationObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
