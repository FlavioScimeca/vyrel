// @vitest-environment jsdom

import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  type TypedDocumentNode,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { parse } from "graphql";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

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

declare module "./types" {
  interface MutationCollectionVariablesRegistry {
    readonly createTask: TaskVariables;
    readonly deleteTask: TaskVariables;
    readonly updateTask: TaskVariables;
  }
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

  it("revalidates active collection instances after create", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const refetchSpy = vi
      .spyOn(network.client, "refetchQueries")
      .mockResolvedValue([] as never);
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          optimistic: ({ input }) => ({ title: input.title }),
          revalidate: { mode: "background" },
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

    expect(refetchSpy).not.toHaveBeenCalled();

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

    await waitFor(() => {
      expect(refetchSpy).toHaveBeenCalledWith({ include: [tasksDocument] });
    });
  });

  it("delays revalidation and resolves typed collection variables", async () => {
    vi.useFakeTimers();
    try {
      const network = createPendingNetwork();
      activeClient = network.client;
      const querySpy = vi
        .spyOn(network.client, "query")
        .mockResolvedValue({ data: { tasks: [] } } as never);
      const { result } = renderHook(
        () =>
          useOptimisticCreate(createTaskDocument, {
            optimistic: ({ input }) => ({ title: input.title }),
            revalidate: {
              delay: 300,
              mode: "background",
              variables: ({ input }) => ({
                organizationId: input.organizationId,
              }),
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

      expect(querySpy).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(299));
      expect(querySpy).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(querySpy).toHaveBeenCalledWith({
        fetchPolicy: "network-only",
        query: tasksDocument,
        variables: { organizationId: "org-1" },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports background revalidation errors without failing the mutation", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const revalidation = Promise.withResolvers<never>();
    vi.spyOn(network.client, "refetchQueries").mockReturnValue(
      revalidation.promise as never
    );
    const onRevalidateError = vi.fn();
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          onRevalidateError,
          optimistic: ({ input }) => ({ title: input.title }),
          revalidate: { mode: "background" },
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

    expect(onRevalidateError).not.toHaveBeenCalled();

    const revalidationError = new Error("Revalidation failed");
    revalidation.reject(revalidationError);

    await waitFor(() => {
      expect(onRevalidateError).toHaveBeenCalledWith(revalidationError);
    });
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

  it("updates optimistically and revalidates active collection instances", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const refetchSpy = vi
      .spyOn(network.client, "refetchQueries")
      .mockResolvedValue([] as never);
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
          revalidate: { mode: "background" },
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

    await waitFor(() => {
      expect(refetchSpy).toHaveBeenCalledWith({ include: [tasksDocument] });
    });
  });

  it("revalidates one exact collection after an update override", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const querySpy = vi
      .spyOn(network.client, "query")
      .mockResolvedValue({ data: { tasks: [] } } as never);
    const { result } = renderHook(
      () =>
        useOptimisticUpdate(updateTaskDocument, {
          current: { id: "task-1", title: "Before" },
          optimistic: ({ input }) => ({ title: input.title }),
          revalidate: {
            variables: { organizationId: "org-1" },
          },
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { taskId: "task-1", title: "After" } },
      });
    });

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

    await waitFor(() => {
      expect(querySpy).toHaveBeenCalledWith({
        fetchPolicy: "network-only",
        query: tasksDocument,
        variables: { organizationId: "org-1" },
      });
    });
  });

  it("deletes optimistically and revalidates active collection instances", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const refetchSpy = vi
      .spyOn(network.client, "refetchQueries")
      .mockResolvedValue([] as never);
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
          revalidate: { mode: "background" },
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

    await waitFor(() => {
      expect(refetchSpy).toHaveBeenCalledWith({ include: [tasksDocument] });
    });
  });

  it("revalidates one exact collection after a delete override", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const querySpy = vi
      .spyOn(network.client, "query")
      .mockResolvedValue({ data: { tasks: [] } } as never);
    const { result } = renderHook(
      () =>
        useOptimisticDelete(deleteTaskDocument, {
          id: ({ input }) => input.taskId,
          revalidate: {
            variables: () => ({ organizationId: "org-1" }),
          },
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { taskId: "task-1" } },
      });
    });

    await act(async () => {
      network.resolve({ deleteTask: "task-1" });
      await mutationPromise;
    });

    await waitFor(() => {
      expect(querySpy).toHaveBeenCalledWith({
        fetchPolicy: "network-only",
        query: tasksDocument,
        variables: { organizationId: "org-1" },
      });
    });
  });

  it("reports active collection revalidation errors separately", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const revalidationError = new Error("Active revalidation failed");
    vi.spyOn(network.client, "refetchQueries").mockRejectedValue(
      revalidationError
    );
    const onRevalidateError = vi.fn();
    const { result } = renderHook(
      () =>
        useOptimisticDelete(deleteTaskDocument, {
          id: ({ input }) => input.taskId,
          onRevalidateError,
          revalidate: { mode: "background" },
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { taskId: "task-1" } },
      });
    });

    await act(async () => {
      network.resolve({ deleteTask: "task-1" });
      await mutationPromise;
    });

    await waitFor(() => {
      expect(onRevalidateError).toHaveBeenCalledWith(revalidationError);
    });
  });
});
