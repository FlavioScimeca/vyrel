import { parse } from "graphql";
import { describe, expect, it } from "vitest";

import { getMutationEntitySelection, getRootResponseKey } from "./document";

describe("GraphQL document inference", () => {
  it("infers aliased root fields", () => {
    const document = parse("query Tasks { items: tasks { id } }");

    expect(getRootResponseKey(document, "query")).toBe("items");
  });

  it("requires an override for multiple root fields", () => {
    const document = parse("query Dashboard { tasks { id } users { id } }");

    expect(() => getRootResponseKey(document, "query")).toThrow(
      "exactly one top-level field"
    );
    expect(getRootResponseKey(document, "query", "tasks")).toBe("tasks");
  });

  it("combines every fragment selected by a mutation", () => {
    const document = parse(`
      mutation UpdateTask {
        updateTask {
          ...TaskIdentity
          ...TaskContent
        }
      }

      fragment TaskIdentity on Task {
        id
      }

      fragment TaskContent on Task {
        title
        updatedAt
      }
    `);

    const selection = getMutationEntitySelection(document);

    expect(selection.typename).toBe("Task");
    expect([...selection.fields]).toEqual(["id", "title", "updatedAt"]);
  });

  it("rejects fragments that describe different mutation entity types", () => {
    const document = parse(`
      mutation UpdateSearchResult {
        updateSearchResult {
          ...TaskResult
          ...UserResult
        }
      }

      fragment TaskResult on Task { id }
      fragment UserResult on User { id }
    `);

    expect(() => getMutationEntitySelection(document)).toThrow(
      "must describe one entity type"
    );
  });
});
