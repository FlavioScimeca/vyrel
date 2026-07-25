import type { FragmentOf } from "gql.tada";

import { graphql } from "@/src/graphql/gql";

export const OrganizationListItemFragment = graphql(`
  fragment OrganizationListItem on Organization {
    createdAt
    id
    imageFull
    imageThumb
    logo
    name
    slug
  }
`);

export type OrganizationListItemRef = FragmentOf<
  typeof OrganizationListItemFragment
>;
