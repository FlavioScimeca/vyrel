import { graphql } from "@/graphql/gql";

import { UserProfileFragment } from "./fragments";

export const UpdateUserDocument = graphql(`
  mutation UpdateUser($input: UpdateUser!) {
    updateUser(input: $input) {
      ...UserProfile
    }
  }
`, [UserProfileFragment]);

export const DeleteUserDocument = graphql(`
  mutation DeleteUser($input: DeleteUser!) {
    deleteUser(input: $input)
  }
`);
