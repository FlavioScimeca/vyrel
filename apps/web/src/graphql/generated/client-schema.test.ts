import { describe, expect, it } from "vitest";
import {
  graphqlClientRegistry,
  graphqlClientTypePolicies,
} from "./client-schema";

describe("generated GraphQL client schema", () => {
  it("uses the immutable organization id for Apollo identity and CRUD", () => {
    expect(graphqlClientTypePolicies.Organization.keyFields).toEqual(["id"]);
    expect(
      graphqlClientRegistry.mutations.DeleteOrganization?.deleteOrganization
        ?.keyField
    ).toBe("id");
    expect(
      graphqlClientRegistry.mutations.UpdateOrganization?.updateOrganization
        ?.keyField
    ).toBe("id");
  });
});
