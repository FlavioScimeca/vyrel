import { graphql } from "@/graphql/gql";

import { UserProfileFragment } from "./fragments";

export const GetUserDocument = graphql(`
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserProfile
    }
  }
`, [UserProfileFragment]);
