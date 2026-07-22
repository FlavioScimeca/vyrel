// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TasksPage from "./page";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  preloadVariables: undefined as unknown,
}));

vi.mock("@/graphql/apollo/client", () => ({
  PreloadQuery: ({
    children,
    variables,
  }: {
    children: ReactNode;
    variables: unknown;
  }) => {
    mocks.preloadVariables = variables;
    return children;
  },
}));

vi.mock("@/lib/server-session", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/features/dashboard/task/screen/tasks", () => ({
  default: () => <div>Tasks screen</div>,
}));

beforeEach(() => {
  mocks.preloadVariables = undefined;
  mocks.getServerSession.mockReset();
  mocks.getServerSession.mockResolvedValue({
    session: { activeOrganizationId: "org-1", id: "session-1" },
    user: { id: "user-1" },
  });
});

afterEach(() => {
  cleanup();
});

describe("TasksPage", () => {
  it("preloads the same normalized variables used by the task screen", async () => {
    const page = await TasksPage({
      searchParams: Promise.resolve({
        createdFrom: "2026-07-20T00:00:00.000Z",
        createdTo: "invalid",
        search: "  ugo  ",
      }),
    });

    render(page);

    expect(screen.getByText("Tasks screen")).toBeVisible();
    expect(mocks.preloadVariables).toEqual({
      createdFrom: "2026-07-20T00:00:00.000Z",
      organizationId: "org-1",
      search: "ugo",
    });
  });

  it("does not issue an unauthenticated preload without an active organization", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const page = await TasksPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("Tasks screen")).toBeVisible();
    expect(mocks.preloadVariables).toBeUndefined();
  });
});
