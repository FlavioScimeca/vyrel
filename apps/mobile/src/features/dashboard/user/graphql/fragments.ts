import type { FragmentOf } from "gql.tada";
import { graphql } from "@/graphql/gql";

export const UserProfileFragment = graphql(`
  fragment UserProfile on User {
    createdAt
    email
    emailVerified
    id
    imageFull
    imageThumb
    name
    updatedAt
  }
`);

export type UserProfileRef = FragmentOf<typeof UserProfileFragment>;
