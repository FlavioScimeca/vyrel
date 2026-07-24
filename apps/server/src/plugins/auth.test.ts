import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  handler: vi.fn(),
  setActiveOrganization: vi.fn(),
}));

const membershipMocks = vi.hoisted(() => ({
  listOrganizationMembershipIdentities: vi.fn(),
}));

vi.mock("@vyrel/auth", () => ({
  auth: {
    api: {
      getSession: authMocks.getSession,
      setActiveOrganization: authMocks.setActiveOrganization,
    },
    handler: authMocks.handler,
  },
}));

vi.mock("@vyrel/db/organization-memberships", () => membershipMocks);

import { authPlugin } from "./auth";

const authSession = (activeOrganizationId: string | null) => ({
  session: {
    activeOrganizationId,
    id: "session-1",
  },
  user: {
    id: "user-1",
  },
});

const memberships = [
  {
    createdAt: new Date("2026-01-01T00:00:00Z"),
    id: "member-1",
    organizationId: "organization-1",
  },
];

function bootstrapRequest(cookie = "better-auth.session_token=session") {
  return new Request("http://localhost/api/auth/bootstrap", {
    headers: { cookie },
    method: "POST",
  });
}

describe("POST /api/auth/bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipMocks.listOrganizationMembershipIdentities.mockResolvedValue(
      memberships
    );
    authMocks.setActiveOrganization.mockResolvedValue({});
  });

  it("returns 401 for an absent or expired session", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await authPlugin.handle(bootstrapRequest());

    expect(response.status).toBe(401);
    expect(
      membershipMocks.listOrganizationMembershipIdentities
    ).not.toHaveBeenCalled();
    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
  });

  it("keeps a valid active organization without persisting again", async () => {
    authMocks.getSession.mockResolvedValue(authSession("organization-1"));

    const response = await authPlugin.handle(bootstrapRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      activeOrganizationId: "organization-1",
      hasOrganizationAccess: true,
      session: { id: "session-1" },
      user: { id: "user-1" },
    });
    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
    expect(authMocks.setActiveOrganization).not.toHaveBeenCalled();
  });

  it.each([
    null,
    "organization-stale",
  ])("repairs an active organization value of %s", async (currentActiveOrganizationId) => {
    authMocks.getSession.mockResolvedValue(
      authSession(currentActiveOrganizationId)
    );

    const response = await authPlugin.handle(bootstrapRequest());

    expect(response.status).toBe(200);
    expect(authMocks.setActiveOrganization).toHaveBeenCalledWith({
      body: { organizationId: "organization-1" },
      headers: expect.any(Headers),
    });
    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
  });

  it("returns no membership without converting it to an error", async () => {
    authMocks.getSession.mockResolvedValue(authSession(null));
    membershipMocks.listOrganizationMembershipIdentities.mockResolvedValue([]);

    const response = await authPlugin.handle(bootstrapRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      activeOrganizationId: null,
      hasOrganizationAccess: false,
    });
  });

  it("surfaces infrastructure failures as 503", async () => {
    authMocks.getSession.mockResolvedValue(authSession(null));
    membershipMocks.listOrganizationMembershipIdentities.mockRejectedValue(
      new Error("database unavailable")
    );

    const response = await authPlugin.handle(bootstrapRequest());

    expect(response.status).toBe(503);
  });
});
