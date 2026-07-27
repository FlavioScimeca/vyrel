import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { Effect } from "effect";

import { deleteOrganization } from "../../services/delete.service";
import { organizationDeleteSchema } from "../../types/base.types";
import { runOrganizationGraphqlEffect } from "../effect";
import { organizationGraphql } from "../organization.query";

const typeOptionsMetadata = {
  description: "Delete an organization the caller belongs to.",
  name: "DeleteOrganization",
};

builder.mutationFields((t) => ({
  deleteOrganization: t.fieldWithInput({
    input: {
      ...organizationGraphql.inputsFrom(organizationDeleteSchema),
    },
    resolve: (_root, args, context) =>
      runOrganizationGraphqlEffect(
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          return yield* deleteOrganization(
            args.input,
            context.headers,
            actorUserId
          );
        }),
        { kind: "mutation", operation: "deleteOrganization" }
      ),
    type: "String",
    typeOptions: typeOptionsMetadata,
  }),
}));
