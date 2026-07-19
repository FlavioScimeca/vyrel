// @vitest-environment jsdom

import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  type TypedDocumentNode,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, renderHook } from "@testing-library/react";
import { parse } from "graphql";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";

import {
  useOptimisticCreate,
  useOptimisticDelete,
  useOptimisticUpdate,
} from "./hooks";
import {
  configureGraphqlClientCache,
  defineGraphqlClientRegistry,
} from "./registry";

interface Task {
  readonly __typename: "Task";
  readonly id: string;
  readonly title: string;
}

interface TasksData {
  readonly tasks: readonly Task[];
}

interface TaskVariables {
  readonly organizationId: string;
}

interface CreateTaskData {
  readonly createTask: Task;
}

interface CreateTaskVariables {
  readonly input: {
    readonly organizationId: string;
    readonly title: string;
  };
}

interface UpdateTaskData {
  readonly updateTask: Task;
}

interface UpdateTaskVariables {
  readonly input: {
    readonly taskId: string;
    readonly title: string;
  };
}

interface DeleteTaskData {
  readonly deleteTask: string;
}

interface DeleteTaskVariables {
  readonly input: {
    readonly taskId: string;
  };
}

const tasksDocument = parse(`
  query ListTasks($organizationId: ID!) {
    tasks(organizationId: $organizationId) {
      id
      title
    }
  }
`) as TypedDocumentNode<TasksData, TaskVariables>;

const createTaskDocument = parse(`
  mutation CreateTask($input: CreateTask!) {
    createTask(input: $input) {
      ...TaskListItem
    }
  }

  fragment TaskListItem on Task {
    id
    title
  }
`) as TypedDocumentNode<CreateTaskData, CreateTaskVariables>;

const updateTaskDocument = parse(`
  mutation UpdateTask($input: UpdateTask!) {
    updateTask(input: $input) {
      ...TaskListItem
    }
  }

  fragment TaskListItem on Task {
    id
    title
  }
`) as TypedDocumentNode<UpdateTaskData, UpdateTaskVariables>;

const deleteTaskDocument = parse(`
  mutation DeleteTask($input: DeleteTask!) {
    deleteTask(input: $input)
  }
`) as TypedDocumentNode<DeleteTaskData, DeleteTaskVariables>;

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
    DeleteTask: {
      deleteTask: {
        entityType: "Task",
        keyField: "id",
        kind: "delete",
      },
    },
    UpdateTask: {
      updateTask: {
        entityType: "Task",
        keyField: "id",
        kind: "update",
      },
    },
  },
});

interface PendingNetwork {
  readonly client: ApolloClient;
  readonly reject: (error: Error) => void;
  readonly resolve: (data: unknown) => void;
}

const createPendingNetwork = (): PendingNetwork => {
  let completeRequest: (() => void) | undefined;
  let failRequest: ((error: Error) => void) | undefined;
  let sendResult: ((result: { readonly data: unknown }) => void) | undefined;
  const cache = configureGraphqlClientCache(
    new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            tasks: { keyArgs: ["organizationId"] },
          },
        },
        Task: { keyFields: ["id"] },
      },
    }),
    registry
  );
  const link = new ApolloLink(
    () =>
      new Observable((observer) => {
        completeRequest = () => observer.complete();
        failRequest = (error) => observer.error(error);
        sendResult = (result) => observer.next(result as never);
      })
  );

  return {
    client: new ApolloClient({ cache, link }),
    reject: (error) => {
      if (failRequest === undefined) {
        throw new Error("No pending GraphQL request to reject.");
      }
      failRequest(error);
    },
    resolve: (data) => {
      if (sendResult === undefined || completeRequest === undefined) {
        throw new Error("No pending GraphQL request to resolve.");
      }
      sendResult({ data });
      completeRequest();
    },
  };
};

let activeClient: ApolloClient;

const ApolloTestProvider = ({ children }: PropsWithChildren) =>
  createElement(ApolloProvider, { children, client: activeClient });

const readTaskIds = (
  client: ApolloClient,
  organizationId: string,
  optimistic = true
): string[] =>
  client.cache
    .readQuery({
      optimistic,
      query: tasksDocument,
      variables: { organizationId },
    })
    ?.tasks.map(({ id }) => id) ?? [];

describe("optimistic mutation hooks", () => {
  it("prepends an optimistic create and replaces it with the server entity", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: { organizationId: "org-1" },
    });
    let customUpdateCalls = 0;
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
          update: () => {
            customUpdateCalls += 1;
          },
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Optimistic" },
        },
      });
    });

    expect(readTaskIds(network.client, "org-1")).toEqual(["temporary-task"]);

    await act(async () => {
      network.resolve({
        createTask: {
          __typename: "Task",
          id: "task-1",
          title: "Created",
        },
      });
      await mutationPromise;
    });

    expect(readTaskIds(network.client, "org-1", false)).toEqual(["task-1"]);
    expect(customUpdateCalls).toBe(2);
  });

  it("rolls an optimistic create back after a network error", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: { organizationId: "org-1" },
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Optimistic" },
        },
      });
    });

    expect(readTaskIds(network.client, "org-1")).toEqual(["temporary-task"]);

    await act(async () => {
      network.reject(new Error("Request failed"));
      await expect(mutationPromise).rejects.toThrow("Request failed");
    });

    expect(readTaskIds(network.client, "org-1", false)).toEqual([]);
  });

  it("updates the normalized entity optimistically", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    network.client.cache.writeQuery({
      data: {
        tasks: [{ __typename: "Task", id: "task-1", title: "Before" }],
      },
      query: tasksDocument,
      variables: { organizationId: "org-1" },
    });
    const current = { id: "task-1", title: "Before" };
    const { result } = renderHook(
      () =>
        useOptimisticUpdate(updateTaskDocument, {
          current,
          optimistic: ({ input }) => ({ title: input.title }),
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { taskId: "task-1", title: "After" } },
      });
    });

    expect(
      network.client.cache.readQuery({
        optimistic: true,
        query: tasksDocument,
        variables: { organizationId: "org-1" },
      })?.tasks[0]?.title
    ).toBe("After");

    await act(async () => {
      network.resolve({
        updateTask: {
          __typename: "Task",
          id: "task-1",
          title: "After",
        },
      });
      await mutationPromise;
    });

    expect(
      network.client.cache.readQuery({
        optimistic: false,
        query: tasksDocument,
        variables: { organizationId: "org-1" },
      })?.tasks[0]?.title
    ).toBe("After");
  });

  it("deletes optimistically from every cached collection variant", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    for (const organizationId of ["org-1", "org-2"]) {
      network.client.cache.writeQuery({
        data: {
          tasks: [{ __typename: "Task", id: "task-1", title: "Task" }],
        },
        query: tasksDocument,
        variables: { organizationId },
      });
    }
    const { result } = renderHook(
      () =>
        useOptimisticDelete(deleteTaskDocument, {
          id: ({ input }) => input.taskId,
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { taskId: "task-1" } },
      });
    });

    expect(readTaskIds(network.client, "org-1")).toEqual([]);
    expect(readTaskIds(network.client, "org-2")).toEqual([]);

    await act(async () => {
      network.resolve({ deleteTask: "task-1" });
      await mutationPromise;
    });

    expect(readTaskIds(network.client, "org-1", false)).toEqual([]);
    expect(readTaskIds(network.client, "org-2", false)).toEqual([]);
  });
});
