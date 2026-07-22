import type { FragmentOf, ResultOf } from "gql.tada";

import type { UserProfileFragment } from "./fragments";

export type UserProfileRef = FragmentOf<typeof UserProfileFragment>;
type UserProfileData = ResultOf<typeof UserProfileFragment>;

/** Existing user fields merged into an optimistic update. */
export type OptimisticUserExisting = UserProfileData;
