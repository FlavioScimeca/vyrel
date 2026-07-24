import { describe, expect, it, vi } from "vitest";

import { switchActiveOrganization } from "./switch-active-organization";

describe("switchActiveOrganization", () => {
  it("refreshes only after the active organization is persisted", async () => {
    const refresh = vi.fn();
    const setActiveOrganization = vi.fn().mockResolvedValue({ error: null });

    const error = await switchActiveOrganization({
      organizationId: "organization-2",
      refresh,
      setActiveOrganization,
    });

    expect(error).toBeNull();
    expect(setActiveOrganization).toHaveBeenCalledWith("organization-2");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the server selection when persistence fails", async () => {
    const refresh = vi.fn();
    const setActiveOrganization = vi.fn().mockResolvedValue({
      error: { message: "Organization is inaccessible." },
    });

    const error = await switchActiveOrganization({
      organizationId: "organization-2",
      refresh,
      setActiveOrganization,
    });

    expect(error).toBe("Organization is inaccessible.");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh after a network error", async () => {
    const refresh = vi.fn();
    const setActiveOrganization = vi
      .fn()
      .mockRejectedValue(new Error("network"));

    const error = await switchActiveOrganization({
      organizationId: "organization-2",
      refresh,
      setActiveOrganization,
    });

    expect(error).toBe("Unable to switch organization.");
    expect(refresh).not.toHaveBeenCalled();
  });
});
