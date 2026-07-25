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
