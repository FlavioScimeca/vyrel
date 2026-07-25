import { graphql } from "@/src/graphql/gql";

import { TaskListItemFragment } from "./fragments";

export const CreateTaskDocument = graphql(`
  mutation CreateTask($input: CreateTask!) {
    createTask(input: $input) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);
