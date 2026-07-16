import type { FragmentOf } from "gql.tada";

import type { TaskListItemFragment } from "./fragments";

export type TaskListItemRef = FragmentOf<typeof TaskListItemFragment>;
