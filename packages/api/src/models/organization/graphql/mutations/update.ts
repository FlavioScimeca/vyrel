import { requireActorEffect } from "@vyrel/graphql/context";
import { builder } from "@vyrel/graphql/pothos";
import { parseArgsEffect } from "@vyrel/graphql/utils/zod-pothos-validation";
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
        Effect.gen(function* () {
          const actorUserId = yield* requireActorEffect(context);
          const input = yield* parseArgsEffect(
            organizationUpdateSchema,
            args.input
          );
          return yield* updateOrganization(input, context.headers, actorUserId);
        }),
        { kind: "mutation", operation: "updateOrganization" }
      ),
    type: OrganizationObject,
    typeOptions: typeOptionsMetadata,
  }),
}));
