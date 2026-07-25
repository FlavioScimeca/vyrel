import type { FragmentOf } from "gql.tada";

import { graphql } from "@/src/graphql/gql";

export const TaskListItemFragment = graphql(`
  fragment TaskListItem on Task {
    createdAt
    description
    id
    imageFull
    imageThumb
    title
    updatedAt
  }
`);

export type TaskListItemRef = FragmentOf<typeof TaskListItemFragment>;
