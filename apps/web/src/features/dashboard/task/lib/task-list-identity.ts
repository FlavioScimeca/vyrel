import { createOptimisticListIdentity } from "@vyrel/graphql-client";

/** Shared Task list identity for optimistic create → real id React keys. */
export const taskListIdentity = createOptimisticListIdentity();
