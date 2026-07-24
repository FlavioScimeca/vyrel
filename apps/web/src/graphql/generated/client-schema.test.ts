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

  it("uses User.id and supports delete without a canonical User collection", () => {
    expect(graphqlClientTypePolicies.User.keyFields).toEqual(["id"]);
    expect("User" in graphqlClientRegistry.collections).toBe(false);
    expect(
      graphqlClientRegistry.mutations.DeleteUser?.deleteUser?.keyField
    ).toBe("id");
    expect(
      graphqlClientRegistry.mutations.UpdateUser?.updateUser?.keyField
    ).toBe("id");
  });
});
