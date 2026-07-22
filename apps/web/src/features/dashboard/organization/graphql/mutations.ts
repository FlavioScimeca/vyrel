import { graphql } from "@/graphql/gql";

import { OrganizationListItemFragment } from "./fragments";

export const UpdateOrganizationDocument = graphql(`
  mutation UpdateOrganization($input: UpdateOrganization!) {
    updateOrganization(input: $input) {
      ...OrganizationListItem
    }
  }
`, [OrganizationListItemFragment]);

export const DeleteOrganizationDocument = graphql(`
  mutation DeleteOrganization($input: DeleteOrganization!) {
    deleteOrganization(input: $input)
  }
`);
