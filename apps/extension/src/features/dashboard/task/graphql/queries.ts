import { graphql } from "@/src/graphql/gql";

import { TaskListItemFragment } from "./fragments";

export const ListTasksDocument = graphql(`
  query ListTasks(
    $organizationId: ID!
    $search: String
    $createdFrom: DateTime
    $createdTo: DateTime
  ) {
    tasks(
      organizationId: $organizationId
      search: $search
      createdFrom: $createdFrom
      createdTo: $createdTo
    ) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);

export const TaskSummaryDocument = graphql(`
  query TaskSummary($organizationId: ID!) {
    taskSummary(organizationId: $organizationId) {
      done
      inProgress
      overdue
      todo
      total
    }
  }
`);
