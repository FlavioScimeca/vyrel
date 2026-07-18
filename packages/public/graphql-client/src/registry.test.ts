import { gql, InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";

import {
  configureGraphqlClientCache,
  defineGraphqlClientRegistry,
  getGraphqlClientRegistry,
  resolveCollectionVariables,
} from "./registry";

const tasksDocument = gql`
  query ListTasks($organizationId: ID!) {
    tasks(organizationId: $organizationId) {
      id
    }
  }
`;

const registry = defineGraphqlClientRegistry({
  collections: {
    Task: {
      query: tasksDocument,
      responseKey: "tasks",
      storeFieldName: "tasks",
    },
  },
  mutations: {
    CreateTask: {
      createTask: {
        collectionVariablePaths: {
          organizationId: ["input", "organizationId"],
        },
        entityType: "Task",
        keyField: "id",
        kind: "create",
      },
    },
  },
});

describe("generated runtime registry", () => {
  it("is scoped to one Apollo cache instance", () => {
    const configuredCache = configureGraphqlClientCache(
      new InMemoryCache(),
      registry
    );

    expect(getGraphqlClientRegistry(configuredCache)).toBe(registry);
    expect(() => getGraphqlClientRegistry(new InMemoryCache())).toThrow(
      "is not configured"
    );
  });

  it("resolves canonical query variables from nested mutation input", () => {
    expect(
      resolveCollectionVariables(
        registry.mutations.CreateTask.createTask.collectionVariablePaths,
        { input: { organizationId: "org-1", title: "Task" } }
      )
    ).toEqual({ organizationId: "org-1" });
  });
});
