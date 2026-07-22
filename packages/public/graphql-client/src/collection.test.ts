import { gql, InMemoryCache, type TypedDocumentNode } from "@apollo/client";
import { describe, expect, it } from "vitest";

import {
  collectionOverrideWhen,
  prependToCollectionVariant,
  prependToList,
  removeFromAllListVariants,
  removeFromCollectionVariant,
} from "./collection";

interface Task {
  readonly __typename: "Task";
  readonly id: string;
  readonly title: string;
}

interface TasksData {
  readonly tasks: readonly Task[];
}

interface AliasedTasksData {
  readonly items: readonly Task[];
}

interface TasksVariables {
  readonly organizationId: string;
}

const tasksDocument = gql`
  query Tasks($organizationId: ID!) {
    tasks(organizationId: $organizationId) {
      id
      title
    }
  }
` as TypedDocumentNode<TasksData, TasksVariables>;

const aliasedTasksDocument = gql`
  query ListAliasedTasks($organizationId: ID!) {
    items: tasks(organizationId: $organizationId) {
      id
      title
    }
  }
` as TypedDocumentNode<AliasedTasksData, TasksVariables>;

const firstVariables = { organizationId: "org-1" };
const secondVariables = { organizationId: "org-2" };

const createCache = (): InMemoryCache => {
  const cache = new InMemoryCache();
  cache.writeQuery({
    data: {
      tasks: [{ __typename: "Task", id: "task-1", title: "First" }],
    },
    query: tasksDocument,
    variables: firstVariables,
  });
  return cache;
};

describe("canonical list collection", () => {
  it("prepends and deduplicates normalized entities", () => {
    const cache = createCache();
    const collection = {
      query: tasksDocument,
      responseKey: "tasks",
      variables: firstVariables,
    };
    const task = { __typename: "Task", id: "task-2", title: "Second" } as const;

    prependToList(cache, collection, task);
    prependToList(cache, collection, task);

    expect(
      cache
        .readQuery({ query: tasksDocument, variables: firstVariables })
        ?.tasks.map((item) => item.id)
    ).toEqual(["task-2", "task-1"]);
  });

  it("prepends to an exact collection variant via the public helper", () => {
    const cache = createCache();
    const task = { __typename: "Task", id: "task-2", title: "Second" } as const;

    prependToCollectionVariant(cache, {
      entity: task,
      query: tasksDocument,
      variables: firstVariables,
    });

    expect(
      cache
        .readQuery({ query: tasksDocument, variables: firstVariables })
        ?.tasks.map((item) => item.id)
    ).toEqual(["task-2", "task-1"]);
  });

  it("builds a typed collection override only when when is true", () => {
    expect(
      collectionOverrideWhen({
        query: tasksDocument,
        variables: firstVariables,
        when: false,
      })
    ).toBeUndefined();

    expect(
      collectionOverrideWhen({
        query: tasksDocument,
        variables: firstVariables,
        when: true,
      })
    ).toEqual({ query: tasksDocument, variables: firstVariables });
  });

  it("removes an entity from an exact collection variant", () => {
    const cache = createCache();
    cache.writeQuery({
      data: {
        tasks: [
          { __typename: "Task", id: "task-1", title: "First" },
          { __typename: "Task", id: "task-2", title: "Second" },
        ],
      },
      query: tasksDocument,
      variables: firstVariables,
    });

    removeFromCollectionVariant(cache, {
      keyValue: "task-1",
      query: tasksDocument,
      variables: firstVariables,
    });

    expect(
      cache
        .readQuery({ query: tasksDocument, variables: firstVariables })
        ?.tasks.map((item) => item.id)
    ).toEqual(["task-2"]);
  });

  it("removes a deleted entity from every cached argument variant", () => {
    const cache = createCache();
    cache.writeQuery({
      data: {
        tasks: [{ __typename: "Task", id: "task-1", title: "First" }],
      },
      query: tasksDocument,
      variables: secondVariables,
    });

    removeFromAllListVariants(cache, "tasks", "id", "task-1");

    expect(
      cache.readQuery({ query: tasksDocument, variables: firstVariables })
        ?.tasks
    ).toEqual([]);
    expect(
      cache.readQuery({ query: tasksDocument, variables: secondVariables })
        ?.tasks
    ).toEqual([]);
  });

  it("removes an entity from an aliased collection using its store field", () => {
    const cache = new InMemoryCache();
    cache.writeQuery({
      data: {
        items: [{ __typename: "Task", id: "task-1", title: "First" }],
      },
      query: aliasedTasksDocument,
      variables: firstVariables,
    });

    removeFromAllListVariants(cache, "tasks", "id", "task-1");

    expect(
      cache.readQuery({
        query: aliasedTasksDocument,
        variables: firstVariables,
      })?.items
    ).toEqual([]);
  });
});
