import type { FragmentOf, ResultOf } from "gql.tada";

import type { OrganizationListItemFragment } from "./fragments";

export type OrganizationListItemRef = FragmentOf<
  typeof OrganizationListItemFragment
>;
type OrganizationListItemData = ResultOf<typeof OrganizationListItemFragment>;

/** Existing organization fields merged into an optimistic update. */
export type OptimisticOrganizationExisting = OrganizationListItemData;
