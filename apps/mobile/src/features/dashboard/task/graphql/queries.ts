import { graphql } from "@/graphql/gql";

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

export const TaskConnectionDocument = graphql(`
  query TaskConnection(
    $organizationId: ID!
    $after: String
    $first: Int
    $search: String
    $statuses: [TaskStatus!]
    $priorities: [TaskPriority!]
    $assigneeId: String
    $labelIds: [String!]
    $dueFrom: LocalDate
    $dueTo: LocalDate
    $sort: TaskSort
  ) {
    taskConnection(
      organizationId: $organizationId
      after: $after
      first: $first
      search: $search
      statuses: $statuses
      priorities: $priorities
      assigneeId: $assigneeId
      labelIds: $labelIds
      dueFrom: $dueFrom
      dueTo: $dueTo
      sort: $sort
    ) {
      nodes {
        ...TaskListItem
      }
      pageInfo {
        endCursor
        hasNextPage
      }
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

export const TaskLabelsDocument = graphql(`
  query TaskLabels($organizationId: ID!) {
    taskLabels(organizationId: $organizationId) {
      color
      id
      name
    }
  }
`);

export const TaskDetailsDocument = graphql(`
  query TaskDetails($id: ID!) {
    task(id: $id) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);
