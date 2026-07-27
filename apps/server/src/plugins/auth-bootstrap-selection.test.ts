// @effect-diagnostics globalDate:off
import { selectActiveOrganizationId } from "@vyrel/db/utils/membership-selection";
import { describe, expect, it } from "vitest";

const membership = (id: string, organizationId: string, createdAt: string) => ({
  createdAt: new Date(createdAt),
  id,
  organizationId,
});

describe("active organization selection", () => {
  const memberships = [
    membership("member-b", "organization-later", "2026-02-01T00:00:00Z"),
    membership("member-z", "organization-tie-z", "2026-01-01T00:00:00Z"),
    membership("member-a", "organization-first", "2026-01-01T00:00:00Z"),
  ];

  it("keeps a valid active membership", () => {
    expect(selectActiveOrganizationId(memberships, "organization-later")).toBe(
      "organization-later"
    );
  });

  it("repairs null and stale values using createdAt then member id", () => {
    expect(selectActiveOrganizationId(memberships, null)).toBe(
      "organization-first"
    );
    expect(selectActiveOrganizationId(memberships, "organization-stale")).toBe(
      "organization-first"
    );
  });

  it("returns null when the user has no membership", () => {
    expect(selectActiveOrganizationId([], "organization-stale")).toBeNull();
  });
});
