import { parse } from "graphql";
import { describe, expect, it } from "vitest";

import { isPublicGraphqlOperation } from "./public-operations";

describe("isPublicGraphqlOperation", () => {
  it("allows the health query without auth", () => {
    const document = parse("query Health { health }");

    expect(isPublicGraphqlOperation(document, "Health")).toBe(true);
  });

  it("blocks protected queries", () => {
    const document = parse(
      "query GetUser($id: ID!) { user(id: $id) { email } }"
    );

    expect(isPublicGraphqlOperation(document, "GetUser")).toBe(false);
  });

  it("blocks mutations", () => {
    const document = parse(
      "mutation UpdateUser($input: UpdateUser!) { updateUser(input: $input) { email } }"
    );

    expect(isPublicGraphqlOperation(document, "UpdateUser")).toBe(false);
  });

  it("allows introspection queries when allowIntrospection is true", () => {
    const document = parse(`
      query IntrospectionQuery {
        __schema {
          queryType { name }
        }
      }
    `);

    expect(
      isPublicGraphqlOperation(document, "IntrospectionQuery", {
        allowIntrospection: true,
      })
    ).toBe(true);
  });

  it("blocks introspection queries when allowIntrospection is false", () => {
    const document = parse(`
      query IntrospectionQuery {
        __schema {
          queryType { name }
        }
      }
    `);

    expect(
      isPublicGraphqlOperation(document, "IntrospectionQuery", {
        allowIntrospection: false,
      })
    ).toBe(false);
  });

  it("blocks mixed introspection and data queries", () => {
    const document = parse(`
      query Mixed {
        __schema { queryType { name } }
        health
      }
    `);

    expect(
      isPublicGraphqlOperation(document, "Mixed", {
        allowIntrospection: true,
      })
    ).toBe(false);
  });
});
