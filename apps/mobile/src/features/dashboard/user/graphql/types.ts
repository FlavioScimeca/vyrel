import type { ResultOf } from "gql.tada";

import type { UserProfileFragment } from "./fragments";

export type OptimisticUserExisting = ResultOf<typeof UserProfileFragment>;
