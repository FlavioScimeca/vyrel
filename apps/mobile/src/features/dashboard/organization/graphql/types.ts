import type { ResultOf } from "gql.tada";

import type { OrganizationListItemFragment } from "./fragments";

export type OptimisticOrganizationExisting = ResultOf<
  typeof OrganizationListItemFragment
>;
