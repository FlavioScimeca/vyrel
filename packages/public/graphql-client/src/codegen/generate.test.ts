import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSchema, parse } from "graphql";
import { describe, expect, it } from "vitest";

import {
  collectGraphqlSources,
  createGeneratedCrudRegistry,
  createGraphqlClientMetadata,
  generateGraphqlClientArtifact,
  validateGraphqlSourceExports,
} from "./generate";

const schema = `
  input CreateTask {
    organizationId: String!
    title: String!
  }

  scalar DateTime

  enum TaskStatus {
    OPEN
    DONE
  }

  type Query {
    tasks(organizationId: ID!): [Task!]!
  }

  type Mutation {
    createTask(input: CreateTask!): Task
    createTaskDirect(organizationId: ID!, title: String!): Task
    deleteTask(id: ID!): ID
    updateTask(id: ID!, title: String): Task
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    updatedAt: DateTime!
  }
`;

const documents = [
  {
    document: parse(`fragment TaskListItem on Task { id title }`),
    location: "/app/src/task/fragments.ts",
  },
  {
    document: parse(`
      query ListTasks($organizationId: ID!) {
        tasks(organizationId: $organizationId) { ...TaskListItem }
      }
    `),
    location: "/app/src/task/queries.ts",
  },
  {
    document: parse(`
      mutation CreateTask($input: CreateTask!) {
        createTask(input: $input) { ...TaskListItem }
      }
    `),
    location: "/app/src/task/mutations.ts",
  },
] as const;

describe("GraphQL Codegen plugin", () => {
  it("preserves model fields and nullability", () => {
    const metadata = createGraphqlClientMetadata(schema, {
      scalars: { DateTime: "string" },
    });

    expect(metadata.queryType).toBe("Query");
    expect(metadata.types.Task?.keyFields).toEqual(["id"]);
    expect(metadata.types.Task?.fields.description).toEqual({
      type: { kind: "NAMED", name: "String" },
    });
    expect(metadata.types.Task?.fields.id).toEqual({
      type: {
        kind: "NON_NULL",
        ofType: { kind: "NAMED", name: "ID" },
      },
    });
    expect(metadata.enums.TaskStatus).toEqual(["OPEN", "DONE"]);
  });

  it("requires mappings for custom GraphQL scalars", () => {
    expect(() => createGraphqlClientMetadata(schema)).toThrow(
      'Custom GraphQL scalar "DateTime" requires a TypeScript mapping'
    );
  });

  it("generates fragment types and the canonical CRUD registry", () => {
    const source = generateGraphqlClientArtifact(
      buildSchema(schema),
      documents,
      "/app/src/graphql/generated/client-schema.ts",
      { scalars: { DateTime: "string" } }
    );

    expect(source).toContain(
      'import type { TaskListItemFragment as FragmentDocument0 } from "../../task/fragments";'
    );
    expect(source).toContain(
      'import { ListTasksDocument as CollectionDocument0 } from "../../task/queries";'
    );
    expect(source).toContain(
      'readonly "TaskListItem": ResultOf<typeof FragmentDocument0>'
    );
    expect(source).toContain(
      '"Task": { query: CollectionDocument0, responseKey: "tasks", storeFieldName: "tasks" }'
    );
    expect(source).toContain(
      '"createTask": {"collectionVariablePaths":{"organizationId":["input","organizationId"]},"entityType":"Task","keyField":"id","kind":"create"}'
    );
  });

  it("binds collection variables independently for every create mutation", () => {
    const sources = collectGraphqlSources([
      ...documents,
      {
        document: parse(`
          mutation CreateTaskDirect($organizationId: ID!, $title: String!) {
            createTaskDirect(
              organizationId: $organizationId
              title: $title
            ) {
              ...TaskListItem
            }
          }
        `),
        location: "/app/src/task/direct-mutation.ts",
      },
    ]);
    const registry = createGeneratedCrudRegistry(
      schema,
      sources.operations,
      { scalars: { DateTime: "string" } }
    );
    const createTask = registry.mutations.find(
      ({ operationName }) => operationName === "CreateTask"
    );
    const createTaskDirect = registry.mutations.find(
      ({ operationName }) => operationName === "CreateTaskDirect"
    );

    expect(createTask?.collectionVariablePaths).toEqual({
      organizationId: ["input", "organizationId"],
    });
    expect(createTaskDirect?.collectionVariablePaths).toEqual({
      organizationId: ["organizationId"],
    });
  });

  it("registers every CRUD field in a multi-root mutation", () => {
    const sources = collectGraphqlSources([
      ...documents,
      {
        document: parse(`
          mutation CreateTaskPair(
            $input: CreateTask!
            $organizationId: ID!
            $title: String!
          ) {
            first: createTask(input: $input) {
              ...TaskListItem
            }
            second: createTaskDirect(
              organizationId: $organizationId
              title: $title
            ) {
              ...TaskListItem
            }
          }
        `),
        location: "/app/src/task/pair-mutation.ts",
      },
    ]);
    const registry = createGeneratedCrudRegistry(
      schema,
      sources.operations,
      { scalars: { DateTime: "string" } }
    );
    const fields = registry.mutations
      .filter(({ operationName }) => operationName === "CreateTaskPair")
      .map(({ responseKey }) => responseKey);

    expect(fields).toEqual(["first", "second"]);
  });

  it("separates a collection alias from its Apollo store field name", () => {
    const aliasedDocuments = [
      documents[0],
      {
        document: parse(`
          query ListTasks($organizationId: ID!) {
            items: tasks(organizationId: $organizationId) {
              ...TaskListItem
            }
          }
        `),
        location: "/app/src/task/aliased-query.ts",
      },
      documents[2],
    ];
    const sources = collectGraphqlSources(aliasedDocuments);
    const registry = createGeneratedCrudRegistry(
      schema,
      sources.operations,
      { scalars: { DateTime: "string" } }
    );

    expect(registry.collections[0]).toMatchObject({
      responseKey: "items",
      storeFieldName: "tasks",
    });
  });

  it("renders configured cache keys and custom scalar types", () => {
    const source = generateGraphqlClientArtifact(
      buildSchema(schema),
      documents,
      "/app/src/graphql/generated/client-schema.ts",
      {
        keyFields: { Task: "title" },
        scalars: { DateTime: "string" },
      }
    );

    expect(source).toContain('"keyFields": [\n        "title"');
    expect(source).toContain('readonly "DateTime": string;');
    expect(source).toContain('"keyField":"title"');
    expect(source).toContain('"Task": { keyFields: ["title"] }');
  });

  it("rejects document exports that do not follow the gql.tada convention", () => {
    const directory = mkdtempSync(join(tmpdir(), "graphql-client-codegen-"));
    const filePath = join(directory, "queries.ts");
    writeFileSync(
      filePath,
      'export const WrongName = graphql(`query ListTasks { tasks { id } }`);'
    );

    try {
      const sources = collectGraphqlSources([
        {
          document: parse("query ListTasks { tasks { id } }"),
          location: filePath,
        },
      ]);

      expect(() => validateGraphqlSourceExports(sources)).toThrow(
        'must be exported as "ListTasksDocument"'
      );
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
