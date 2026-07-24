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
import { createOptimisticListIdentity } from "./optimistic-list-identity";
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
  readonly search?: string;
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

interface Organization {
  readonly __typename: "Organization";
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

interface OrganizationsData {
  readonly organizations: readonly Organization[];
}

interface DeleteOrganizationData {
  readonly deleteOrganization: string;
}

interface DeleteOrganizationVariables {
  readonly input: {
    readonly organizationId: string;
  };
}

interface UpdateOrganizationData {
  readonly updateOrganization: Organization;
}

interface UpdateOrganizationVariables {
  readonly input: {
    readonly name?: string;
    readonly organizationId: string;
    readonly slug?: string;
  };
}

interface User {
  readonly __typename: "User";
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

interface DeleteUserData {
  readonly deleteUser: boolean;
}

interface DeleteUserVariables {
  readonly input: {
    readonly userId: string;
  };
}

const tasksDocument = parse(`
  query ListTasks($organizationId: ID!, $search: String) {
    tasks(organizationId: $organizationId, search: $search) {
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

const organizationsDocument = parse(`
  query ListOrganizations {
    organizations {
      id
      name
      slug
    }
  }
`) as TypedDocumentNode<OrganizationsData, Record<never, never>>;

const organizationCacheFragment = parse(`
  fragment OrganizationCacheIdentity on Organization {
    id
    name
    slug
  }
`) as TypedDocumentNode<Organization, Record<never, never>>;

const deleteOrganizationDocument = parse(`
  mutation DeleteOrganization($input: DeleteOrganization!) {
    deleteOrganization(input: $input)
  }
`) as TypedDocumentNode<DeleteOrganizationData, DeleteOrganizationVariables>;

const updateOrganizationDocument = parse(`
  mutation UpdateOrganization($input: UpdateOrganization!) {
    updateOrganization(input: $input) {
      ...OrganizationCacheIdentity
    }
  }

  fragment OrganizationCacheIdentity on Organization {
    id
    name
    slug
  }
`) as TypedDocumentNode<UpdateOrganizationData, UpdateOrganizationVariables>;

const deleteUserDocument = parse(`
  mutation DeleteUser($input: DeleteUser!) {
    deleteUser(input: $input)
  }
`) as TypedDocumentNode<DeleteUserData, DeleteUserVariables>;

const userCacheFragment = parse(`
  fragment UserCacheIdentity on User {
    email
    id
    name
  }
`) as TypedDocumentNode<User, Record<never, never>>;

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

const organizationRegistry = defineGraphqlClientRegistry({
  collections: {
    Organization: {
      query: organizationsDocument,
      responseKey: "organizations",
      storeFieldName: "organizations",
    },
  },
  mutations: {
    DeleteOrganization: {
      deleteOrganization: {
        entityType: "Organization",
        keyField: "slug",
        kind: "delete",
      },
    },
  },
});

const organizationIdRegistry = defineGraphqlClientRegistry({
  collections: {
    Organization: {
      query: organizationsDocument,
      responseKey: "organizations",
      storeFieldName: "organizations",
    },
  },
  mutations: {
    DeleteOrganization: {
      deleteOrganization: {
        entityType: "Organization",
        keyField: "id",
        kind: "delete",
      },
    },
    UpdateOrganization: {
      updateOrganization: {
        entityType: "Organization",
        keyField: "id",
        kind: "update",
      },
    },
  },
});

const userRegistry = defineGraphqlClientRegistry({
  collections: {},
  mutations: {
    DeleteUser: {
      deleteUser: {
        entityType: "User",
        keyField: "id",
        kind: "delete",
      },
    },
  },
});

interface PendingNetwork {
  readonly client: ApolloClient;
  readonly reject: (error: Error) => void;
  readonly resolve: (data: unknown) => void;
}

interface ConcurrentNetwork {
  readonly client: ApolloClient;
  readonly reject: (title: string, error: Error) => void;
  readonly resolve: (title: string, data: unknown) => void;
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
            tasks: { keyArgs: ["organizationId", "search"] },
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

const createConcurrentNetwork = (): ConcurrentNetwork => {
  const pendingRequests = new Map<
    string,
    {
      readonly complete: () => void;
      readonly reject: (error: Error) => void;
      readonly resolve: (result: { readonly data: unknown }) => void;
    }
  >();
  const cache = configureGraphqlClientCache(
    new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            tasks: { keyArgs: ["organizationId", "search"] },
          },
        },
        Task: { keyFields: ["id"] },
      },
    }),
    registry
  );
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { input } = operation.variables as CreateTaskVariables;
        const { title } = input;
        pendingRequests.set(title, {
          complete: () => observer.complete(),
          reject: (error) => observer.error(error),
          resolve: (result) => observer.next(result as never),
        });
      })
  );
  const getRequest = (title: string) => {
    const request = pendingRequests.get(title);
    if (request === undefined) {
      throw new Error(`No pending GraphQL request for "${title}".`);
    }
    return request;
  };

  return {
    client: new ApolloClient({ cache, link }),
    reject: (title, error) => {
      getRequest(title).reject(error);
      pendingRequests.delete(title);
    },
    resolve: (title, data) => {
      const request = getRequest(title);
      request.resolve({ data });
      request.complete();
      pendingRequests.delete(title);
    },
  };
};

const createOrganizationDeleteNetwork = (): PendingNetwork => {
  let completeRequest: (() => void) | undefined;
  let failRequest: ((error: Error) => void) | undefined;
  let sendResult: ((result: { readonly data: unknown }) => void) | undefined;
  const cache = configureGraphqlClientCache(
    new InMemoryCache({
      typePolicies: {
        Organization: { keyFields: ["slug"] },
      },
    }),
    organizationRegistry
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

const createOrganizationIdNetwork = (): PendingNetwork => {
  let completeRequest: (() => void) | undefined;
  let failRequest: ((error: Error) => void) | undefined;
  let sendResult: ((result: { readonly data: unknown }) => void) | undefined;
  const cache = configureGraphqlClientCache(
    new InMemoryCache({
      typePolicies: {
        Organization: { keyFields: ["id"] },
      },
    }),
    organizationIdRegistry
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

const createUserDeleteNetwork = (): PendingNetwork => {
  let completeRequest: (() => void) | undefined;
  let failRequest: ((error: Error) => void) | undefined;
  let sendResult: ((result: { readonly data: unknown }) => void) | undefined;
  const cache = configureGraphqlClientCache(
    new InMemoryCache({
      typePolicies: {
        User: { keyFields: ["id"] },
      },
    }),
    userRegistry
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
  variables: TaskVariables,
  optimistic = true
): string[] =>
  client.cache
    .readQuery({
      optimistic,
      query: tasksDocument,
      variables,
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

    expect(readTaskIds(network.client, { organizationId: "org-1" })).toEqual([
      "temporary-task",
    ]);

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

    expect(
      readTaskIds(network.client, { organizationId: "org-1" }, false)
    ).toEqual(["task-1"]);
    expect(customUpdateCalls).toBe(2);
  });

  it("registers a custom optimistic id with the integrated identity", async () => {
    const network = createPendingNetwork();
    const identity = createOptimisticListIdentity();
    activeClient = network.client;
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: { organizationId: "org-1" },
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          identity,
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "optimistic-custom",
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Custom" },
        },
      });
    });

    expect(readTaskIds(network.client, { organizationId: "org-1" })).toEqual([
      "optimistic-custom",
    ]);

    await act(async () => {
      network.resolve({
        createTask: {
          __typename: "Task",
          id: "task-custom",
          title: "Custom",
        },
      });
      await mutationPromise;
    });

    expect(identity.getKey("task-custom")).toBe("optimistic-custom");
  });

  it("binds concurrent optimistic identities to out-of-order responses", async () => {
    const network = createConcurrentNetwork();
    const optimisticIds = ["optimistic-a", "optimistic-b"];
    const identity = createOptimisticListIdentity({
      createId: () => {
        const nextId = optimisticIds.shift();
        if (nextId === undefined) {
          throw new Error("No optimistic id available.");
        }
        return nextId;
      },
    });
    activeClient = network.client;
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: { organizationId: "org-1" },
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          identity,
          optimistic: ({ input }) => ({ title: input.title }),
        }),
      { wrapper: ApolloTestProvider }
    );

    let firstMutation: ReturnType<(typeof result.current)[0]>;
    let secondMutation: ReturnType<(typeof result.current)[0]>;
    act(() => {
      firstMutation = result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "First" },
        },
      });
      secondMutation = result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Second" },
        },
      });
    });

    expect(readTaskIds(network.client, { organizationId: "org-1" })).toEqual([
      "optimistic-b",
      "optimistic-a",
    ]);

    await act(async () => {
      network.resolve("Second", {
        createTask: {
          __typename: "Task",
          id: "task-b",
          title: "Second",
        },
      });
      await secondMutation;
    });
    await act(async () => {
      network.resolve("First", {
        createTask: {
          __typename: "Task",
          id: "task-a",
          title: "First",
        },
      });
      await firstMutation;
    });

    expect(identity.getKey("task-a")).toBe("optimistic-a");
    expect(identity.getKey("task-b")).toBe("optimistic-b");
    expect(
      readTaskIds(network.client, { organizationId: "org-1" }, false)
    ).toEqual(["task-a", "task-b"]);
  });

  it("abandons only the failed identity while another create succeeds", async () => {
    const network = createConcurrentNetwork();
    const optimisticIds = ["optimistic-failed", "optimistic-success"];
    const identity = createOptimisticListIdentity({
      createId: () => optimisticIds.shift() ?? "optimistic-unexpected",
    });
    activeClient = network.client;
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: { organizationId: "org-1" },
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          identity,
          onError: () => undefined,
          optimistic: ({ input }) => ({ title: input.title }),
        }),
      { wrapper: ApolloTestProvider }
    );

    let failedMutation: ReturnType<(typeof result.current)[0]>;
    let successfulMutation: ReturnType<(typeof result.current)[0]>;
    act(() => {
      failedMutation = result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Failed" },
        },
      });
      successfulMutation = result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Successful" },
        },
      });
    });

    await act(async () => {
      network.resolve("Successful", {
        createTask: {
          __typename: "Task",
          id: "task-success",
          title: "Successful",
        },
      });
      await successfulMutation;
    });
    await act(async () => {
      network.reject("Failed", new Error("Create failed"));
      await expect(failedMutation).rejects.toThrow("Create failed");
    });

    expect(identity.getKey("task-success")).toBe("optimistic-success");
    expect(identity.getKey("optimistic-failed")).toBe("optimistic-failed");
    expect(
      readTaskIds(network.client, { organizationId: "org-1" }, false)
    ).toEqual(["task-success"]);
  });

  it("writes only the canonical collection when collection override is omitted", () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const baseVariables = { organizationId: "org-1" };
    const filteredVariables = { organizationId: "org-1", search: "test" };
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: baseVariables,
    });
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: filteredVariables,
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
        }),
      { wrapper: ApolloTestProvider }
    );

    act(() => {
      result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "test" },
        },
      });
    });

    expect(readTaskIds(network.client, baseVariables)).toEqual([
      "temporary-task",
    ]);
    expect(readTaskIds(network.client, filteredVariables)).toEqual([]);
  });

  it("appends and deduplicates in canonical and override collections", () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const baseVariables = { organizationId: "org-1" };
    const filteredVariables = { organizationId: "org-1", search: "test" };
    const existingTask = {
      __typename: "Task",
      id: "task-existing",
      title: "Existing",
    } as const;
    for (const variables of [baseVariables, filteredVariables]) {
      network.client.cache.writeQuery({
        data: { tasks: [existingTask] },
        query: tasksDocument,
        variables,
      });
    }
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          collection: {
            query: tasksDocument,
            variables: filteredVariables,
          },
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
          placement: "append",
        }),
      { wrapper: ApolloTestProvider }
    );

    act(() => {
      result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Appended" },
        },
      });
    });

    expect(readTaskIds(network.client, baseVariables)).toEqual([
      "task-existing",
      "temporary-task",
    ]);
    expect(readTaskIds(network.client, filteredVariables)).toEqual([
      "task-existing",
      "temporary-task",
    ]);
  });

  it("dual-writes canonical and filtered collection variants", () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const baseVariables = { organizationId: "org-1" };
    const filteredVariables = { organizationId: "org-1", search: "test" };
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: baseVariables,
    });
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: filteredVariables,
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          collection: {
            query: tasksDocument,
            variables: filteredVariables,
          },
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
        }),
      { wrapper: ApolloTestProvider }
    );

    act(() => {
      result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "test" },
        },
      });
    });

    expect(readTaskIds(network.client, baseVariables)).toEqual([
      "temporary-task",
    ]);
    expect(readTaskIds(network.client, filteredVariables)).toEqual([
      "temporary-task",
    ]);
  });

  it("resolves collection override from mutation variables", () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const baseVariables = { organizationId: "org-1" };
    const filteredVariables = { organizationId: "org-1", search: "test" };
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: baseVariables,
    });
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: filteredVariables,
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          collection: ({ input }) =>
            input.title.toLowerCase().includes("test")
              ? {
                  query: tasksDocument,
                  variables: filteredVariables,
                }
              : undefined,
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
        }),
      { wrapper: ApolloTestProvider }
    );

    act(() => {
      result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "other" },
        },
      });
    });

    expect(readTaskIds(network.client, baseVariables)).toEqual([
      "temporary-task",
    ]);
    expect(readTaskIds(network.client, filteredVariables)).toEqual([]);
  });

  it("deduplicates when collection override matches the canonical slot", () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const baseVariables = { organizationId: "org-1" };
    network.client.cache.writeQuery({
      data: { tasks: [] },
      query: tasksDocument,
      variables: baseVariables,
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          collection: {
            query: tasksDocument,
            variables: baseVariables,
          },
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
        }),
      { wrapper: ApolloTestProvider }
    );

    act(() => {
      result.current[0]({
        variables: {
          input: { organizationId: "org-1", title: "Optimistic" },
        },
      });
    });

    expect(readTaskIds(network.client, baseVariables)).toEqual([
      "temporary-task",
    ]);
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

    expect(readTaskIds(network.client, { organizationId: "org-1" })).toEqual([
      "temporary-task",
    ]);

    await act(async () => {
      network.reject(new Error("Request failed"));
      await expect(mutationPromise).rejects.toThrow("Request failed");
    });

    expect(
      readTaskIds(network.client, { organizationId: "org-1" }, false)
    ).toEqual([]);
  });

  it("rolls an appended optimistic create back without reordering existing items", async () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    const variables = { organizationId: "org-1" };
    network.client.cache.writeQuery({
      data: {
        tasks: [
          {
            __typename: "Task",
            id: "task-existing",
            title: "Existing",
          },
        ],
      },
      query: tasksDocument,
      variables,
    });
    const { result } = renderHook(
      () =>
        useOptimisticCreate(createTaskDocument, {
          optimistic: ({ input }) => ({ title: input.title }),
          optimisticId: () => "temporary-task",
          placement: "append",
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

    expect(readTaskIds(network.client, variables)).toEqual([
      "task-existing",
      "temporary-task",
    ]);

    await act(async () => {
      network.reject(new Error("Request failed"));
      await expect(mutationPromise).rejects.toThrow("Request failed");
    });

    expect(readTaskIds(network.client, variables, false)).toEqual([
      "task-existing",
    ]);
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

  it("protects update optimistic data and applies a per-call update afterward", () => {
    const network = createPendingNetwork();
    activeClient = network.client;
    network.client.cache.writeQuery({
      data: {
        tasks: [{ __typename: "Task", id: "task-1", title: "Before" }],
      },
      query: tasksDocument,
      variables: { organizationId: "org-1" },
    });
    let configuredUpdateCalls = 0;
    let titleObservedByPerCallUpdate: string | undefined;
    const current = { id: "task-1", title: "Before" };
    const { result } = renderHook(
      () =>
        useOptimisticUpdate(updateTaskDocument, {
          current,
          optimistic: ({ input }) => ({ title: input.title }),
          update: () => {
            configuredUpdateCalls += 1;
          },
        }),
      { wrapper: ApolloTestProvider }
    );
    type UnsafeUpdateOptions = {
      readonly optimisticResponse: UpdateTaskData;
      readonly update: typeof result.current extends readonly [
        infer TMutation,
        unknown,
      ]
        ? TMutation extends (options: infer TOptions) => Promise<unknown>
          ? NonNullable<
              TOptions extends { readonly update?: infer TUpdate }
                ? TUpdate
                : never
            >
          : never
        : never;
      readonly variables: UpdateTaskVariables;
    };
    const executeWithUnsafeOverride = result.current[0] as unknown as (
      options: UnsafeUpdateOptions
    ) => Promise<unknown>;

    act(() => {
      executeWithUnsafeOverride({
        optimisticResponse: {
          updateTask: {
            __typename: "Task",
            id: "task-1",
            title: "Hacked",
          },
        },
        update: (cache) => {
          titleObservedByPerCallUpdate = cache.readQuery({
            optimistic: true,
            query: tasksDocument,
            variables: { organizationId: "org-1" },
          })?.tasks[0]?.title;
        },
        variables: { input: { taskId: "task-1", title: "Protected" } },
      });
    });

    expect(titleObservedByPerCallUpdate).toBe("Protected");
    expect(configuredUpdateCalls).toBe(0);
    expect(
      network.client.cache.readQuery({
        optimistic: true,
        query: tasksDocument,
        variables: { organizationId: "org-1" },
      })?.tasks[0]?.title
    ).toBe("Protected");
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

    expect(readTaskIds(network.client, { organizationId: "org-1" })).toEqual(
      []
    );
    expect(readTaskIds(network.client, { organizationId: "org-2" })).toEqual(
      []
    );

    await act(async () => {
      network.resolve({ deleteTask: "task-1" });
      await mutationPromise;
    });

    expect(
      readTaskIds(network.client, { organizationId: "org-1" }, false)
    ).toEqual([]);
    expect(
      readTaskIds(network.client, { organizationId: "org-2" }, false)
    ).toEqual([]);
  });

  it("evicts an entity without a canonical collection and preserves built-in ordering", async () => {
    const network = createUserDeleteNetwork();
    const identity = createOptimisticListIdentity();
    activeClient = network.client;
    const user = {
      __typename: "User",
      email: "user@example.com",
      id: "user-1",
      name: "User",
    } as const;
    const normalizedId = network.client.cache.identify(user);
    if (normalizedId === undefined) {
      throw new Error("Expected User to have a normalized cache id.");
    }
    network.client.cache.writeFragment({
      data: user,
      fragment: userCacheFragment,
      id: normalizedId,
    });
    identity.begin("optimistic-user");
    identity.commit("optimistic-user", user.id);
    let configuredUpdateCalls = 0;
    const observedAfterBuiltIn: boolean[] = [];
    const { result } = renderHook(
      () =>
        useOptimisticDelete(deleteUserDocument, {
          id: ({ input }) => input.userId,
          identity,
          update: () => {
            configuredUpdateCalls += 1;
          },
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        update: (cache) => {
          observedAfterBuiltIn.push(
            cache.readFragment({
              fragment: userCacheFragment,
              id: normalizedId,
            }) === null
          );
        },
        variables: { input: { userId: user.id } },
      });
    });

    expect(observedAfterBuiltIn).toEqual([true]);
    expect(
      network.client.cache.readFragment({
        fragment: userCacheFragment,
        id: normalizedId,
        optimistic: true,
      })
    ).toBeNull();
    expect(identity.getKey(user.id)).toBe("optimistic-user");

    await act(async () => {
      network.resolve({ deleteUser: true });
      await mutationPromise;
    });

    expect(observedAfterBuiltIn).toEqual([true, true]);
    expect(configuredUpdateCalls).toBe(0);
    expect(identity.getKey(user.id)).toBe(user.id);
    expect(
      network.client.cache.readFragment({
        fragment: userCacheFragment,
        id: normalizedId,
        optimistic: false,
      })
    ).toBeNull();
  });

  it("rolls back entity-only eviction and retains stable identity on error", async () => {
    const network = createUserDeleteNetwork();
    const identity = createOptimisticListIdentity();
    activeClient = network.client;
    const user = {
      __typename: "User",
      email: "user@example.com",
      id: "user-1",
      name: "User",
    } as const;
    const normalizedId = network.client.cache.identify(user);
    if (normalizedId === undefined) {
      throw new Error("Expected User to have a normalized cache id.");
    }
    network.client.cache.writeFragment({
      data: user,
      fragment: userCacheFragment,
      id: normalizedId,
    });
    identity.begin("optimistic-user");
    identity.commit("optimistic-user", user.id);
    const { result } = renderHook(
      () =>
        useOptimisticDelete(deleteUserDocument, {
          id: ({ input }) => input.userId,
          identity,
          onError: () => undefined,
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { userId: user.id } },
      });
    });

    expect(
      network.client.cache.readFragment({
        fragment: userCacheFragment,
        id: normalizedId,
        optimistic: true,
      })
    ).toBeNull();

    await act(async () => {
      network.reject(new Error("Delete failed"));
      await expect(mutationPromise).rejects.toThrow("Delete failed");
    });

    expect(identity.getKey(user.id)).toBe("optimistic-user");
    expect(
      network.client.cache.readFragment({
        fragment: userCacheFragment,
        id: normalizedId,
        optimistic: false,
      })
    ).toEqual(user);
  });

  it("keeps a custom-key delete removed when the server returns a different id", async () => {
    const network = createOrganizationDeleteNetwork();
    activeClient = network.client;
    const organization = {
      __typename: "Organization",
      id: "org-database-id",
      name: "Acme",
      slug: "acme",
    } as const;
    network.client.cache.writeQuery({
      data: { organizations: [organization] },
      query: organizationsDocument,
    });
    const normalizedId = network.client.cache.identify(organization);
    if (normalizedId === undefined) {
      throw new Error("Expected Organization to have a normalized cache id.");
    }
    const { result } = renderHook(
      () =>
        useOptimisticDelete(deleteOrganizationDocument, {
          id: () => organization.slug,
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { organizationId: organization.id } },
      });
    });

    expect(
      network.client.cache.readQuery({
        optimistic: true,
        query: organizationsDocument,
      })?.organizations
    ).toEqual([]);

    await act(async () => {
      network.resolve({ deleteOrganization: organization.id });
      await mutationPromise;
    });

    expect(
      network.client.cache.readQuery({
        optimistic: false,
        query: organizationsDocument,
      })?.organizations
    ).toEqual([]);
    expect(
      network.client.cache.readFragment({
        fragment: organizationCacheFragment,
        id: normalizedId,
        optimistic: false,
      })
    ).toBeNull();
  });

  it("keeps an organization normalized by id when its slug changes", async () => {
    const network = createOrganizationIdNetwork();
    activeClient = network.client;
    const organization = {
      __typename: "Organization",
      id: "org-1",
      name: "Acme",
      slug: "acme",
    } as const;
    network.client.cache.writeQuery({
      data: { organizations: [organization] },
      query: organizationsDocument,
    });
    const normalizedId = network.client.cache.identify(organization);
    const { result } = renderHook(
      () =>
        useOptimisticUpdate(updateOrganizationDocument, {
          current: organization,
          optimistic: ({ input }) => ({
            name: input.name ?? organization.name,
            slug: input.slug ?? organization.slug,
          }),
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: {
          input: { organizationId: organization.id, slug: "acme-renamed" },
        },
      });
    });

    expect(
      network.client.cache.readQuery({
        optimistic: true,
        query: organizationsDocument,
      })?.organizations
    ).toEqual([
      {
        ...organization,
        slug: "acme-renamed",
      },
    ]);

    await act(async () => {
      network.resolve({
        updateOrganization: {
          ...organization,
          slug: "acme-renamed",
        },
      });
      await mutationPromise;
    });

    expect(network.client.cache.identify(organization)).toBe(normalizedId);
    expect(
      network.client.cache.readQuery({
        optimistic: false,
        query: organizationsDocument,
      })?.organizations
    ).toHaveLength(1);
  });

  it("deletes an organization by its immutable id", async () => {
    const network = createOrganizationIdNetwork();
    activeClient = network.client;
    const organization = {
      __typename: "Organization",
      id: "org-1",
      name: "Acme",
      slug: "acme",
    } as const;
    network.client.cache.writeQuery({
      data: { organizations: [organization] },
      query: organizationsDocument,
    });
    const normalizedId = network.client.cache.identify(organization);
    if (normalizedId === undefined) {
      throw new Error("Expected Organization to have a normalized cache id.");
    }
    const { result } = renderHook(
      () =>
        useOptimisticDelete(deleteOrganizationDocument, {
          id: ({ input }) => input.organizationId,
        }),
      { wrapper: ApolloTestProvider }
    );

    let mutationPromise: ReturnType<(typeof result.current)[0]>;
    act(() => {
      mutationPromise = result.current[0]({
        variables: { input: { organizationId: organization.id } },
      });
    });

    expect(
      network.client.cache.readQuery({
        optimistic: true,
        query: organizationsDocument,
      })?.organizations
    ).toEqual([]);

    await act(async () => {
      network.resolve({ deleteOrganization: organization.id });
      await mutationPromise;
    });

    expect(
      network.client.cache.readFragment({
        fragment: organizationCacheFragment,
        id: normalizedId,
        optimistic: false,
      })
    ).toBeNull();
  });
});
