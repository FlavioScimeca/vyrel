import { describe, expect, it } from "vitest";

import {
  shouldRemoveFromVisibleFilteredList,
  taskBelongsToVisibleList,
} from "./matches-visible-task-list";

describe("taskBelongsToVisibleList", () => {
  it("returns false when there are no extra filters", () => {
    expect(
      taskBelongsToVisibleList(
        { description: null, title: "Ship it" },
        { organizationId: "org-1" }
      )
    ).toBe(false);
  });

  it("returns true when search matches title", () => {
    expect(
      taskBelongsToVisibleList(
        { description: null, title: "Write a test" },
        { organizationId: "org-1", search: "test" }
      )
    ).toBe(true);
  });

  it("returns true when search matches description", () => {
    expect(
      taskBelongsToVisibleList(
        { description: "Update the docs", title: "Ship it" },
        { organizationId: "org-1", search: "docs" }
      )
    ).toBe(true);
  });

  it("returns false when search does not match", () => {
    expect(
      taskBelongsToVisibleList(
        { description: null, title: "Ship it" },
        { organizationId: "org-1", search: "test" }
      )
    ).toBe(false);
  });

  it("returns false when date filters are present", () => {
    expect(
      taskBelongsToVisibleList(
        { description: null, title: "test task" },
        {
          createdFrom: "2026-01-01T00:00:00.000Z",
          organizationId: "org-1",
          search: "test",
        }
      )
    ).toBe(false);
  });
});

describe("shouldRemoveFromVisibleFilteredList", () => {
  it("returns false when there is no search filter", () => {
    expect(
      shouldRemoveFromVisibleFilteredList(
        { description: null, title: "Ship it" },
        { organizationId: "org-1" }
      )
    ).toBe(false);
  });

  it("returns false when search still matches", () => {
    expect(
      shouldRemoveFromVisibleFilteredList(
        { description: null, title: "Write a test" },
        { organizationId: "org-1", search: "test" }
      )
    ).toBe(false);
  });

  it("returns true when search no longer matches", () => {
    expect(
      shouldRemoveFromVisibleFilteredList(
        { description: null, title: "Ship it" },
        { organizationId: "org-1", search: "test" }
      )
    ).toBe(true);
  });

  it("returns false when date filters make membership unknown", () => {
    expect(
      shouldRemoveFromVisibleFilteredList(
        { description: null, title: "Ship it" },
        {
          createdFrom: "2026-01-01T00:00:00.000Z",
          organizationId: "org-1",
          search: "test",
        }
      )
    ).toBe(false);
  });
});
