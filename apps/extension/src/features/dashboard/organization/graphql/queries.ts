import { graphql } from "@/src/graphql/gql";

import { OrganizationListItemFragment } from "./fragments";

export const ListOrganizationsDocument = graphql(`
  query ListOrganizations {
    organizations {
      ...OrganizationListItem
    }
  }
`, [OrganizationListItemFragment]);
