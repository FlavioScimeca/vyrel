import { graphql } from "@/graphql/gql";

import { TaskListItemFragment } from "./fragments";

export const ListTasksDocument = graphql(`
  query ListTasks($organizationId: ID!) {
    tasks(organizationId: $organizationId) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);
