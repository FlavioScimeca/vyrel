import { graphql } from "@/graphql/gql";

export const TaskListItemFragment = graphql(`
  fragment TaskListItem on Task {
    assignee {
      id
      imageThumb
      name
    }
    createdAt
    description
    dueDate
    id
    imageFull
    imageThumb
    labels {
      color
      id
      name
    }
    organizationId
    priority
    status
    title
    updatedAt
  }
`);
