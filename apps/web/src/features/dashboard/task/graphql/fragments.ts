import { graphql } from "@/graphql/gql";

export const TaskListItemFragment = graphql(`
  fragment TaskListItem on Task {
    createdAt
    description
    id
    imageFull
    imageThumb
    title
  }
`);
