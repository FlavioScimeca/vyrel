import { graphql } from "@/graphql/gql";

import { TaskListItemFragment } from "./fragments";

export const CreateTaskDocument = graphql(`
  mutation CreateTask($input: CreateTask!) {
    createTask(input: $input) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);

export const UpdateTaskDocument = graphql(`
  mutation UpdateTask($input: UpdateTask!) {
    updateTask(input: $input) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);

export const DeleteTaskDocument = graphql(`
  mutation DeleteTask($input: DeleteTask!) {
    deleteTask(input: $input)
  }
`);

export const CreateTaskLabelDocument = graphql(`
  mutation CreateTaskLabel($input: CreateTaskLabel!) {
    createTaskLabel(input: $input) {
      color
      id
      name
    }
  }
`);
