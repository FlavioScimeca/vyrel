import { describe, expect, it } from "vitest";

import {
  localDateSchema,
  taskCreateSchema,
  taskLabelCreateSchema,
  taskUpdateSchema,
} from "./base.types";
import { taskConnectionSchema, tasksByOrganizationSchema } from "./extra.types";

describe("task input schemas", () => {
  it("accepts the premium task fields and applies defaults", () => {
    const task = taskCreateSchema.parse({
      organizationId: "org-1",
      title: "Prepare launch",
    });

    expect(task.status).toBe("TODO");
    expect(task.priority).toBe("NONE");
    expect(task.labelIds).toEqual([]);
  });

  it.each([
    "2026-02-29",
    "2026-13-01",
    "24-01-01",
    "tomorrow",
  ])("rejects invalid local date %s", (value) => {
    expect(localDateSchema.safeParse(value).success).toBe(false);
  });

  it("accepts leap-day local dates without a timezone", () => {
    expect(localDateSchema.parse("2028-02-29")).toBe("2028-02-29");
  });

  it("allows fields to be explicitly cleared during update", () => {
    const update = taskUpdateSchema.parse({
      assigneeId: null,
      dueDate: null,
      labelIds: [],
      removeImage: true,
      taskId: "task-1",
    });

    expect(update).toMatchObject({
      assigneeId: null,
      dueDate: null,
      labelIds: [],
      removeImage: true,
    });
  });

  it("does not clear labels when label IDs are omitted", () => {
    const update = taskUpdateSchema.parse({
      status: "DONE",
      taskId: "task-1",
    });

    expect(update.labelIds).toBeUndefined();
  });

  it("validates filters, sorting, and page size", () => {
    expect(
      taskConnectionSchema.parse({
        first: 100,
        organizationId: "org-1",
        priorities: ["HIGH"],
        sort: "PRIORITY",
        statuses: ["IN_PROGRESS"],
      })
    ).toMatchObject({ first: 100, sort: "PRIORITY" });
    expect(
      taskConnectionSchema.safeParse({
        first: 101,
        organizationId: "org-1",
      }).success
    ).toBe(false);
    expect(
      tasksByOrganizationSchema.safeParse({
        dueFrom: "2026-08-02",
        dueTo: "2026-08-01",
        organizationId: "org-1",
      }).success
    ).toBe(false);
  });

  it("requires a valid reusable-label color", () => {
    expect(
      taskLabelCreateSchema.safeParse({
        color: "#7357C8",
        name: "Launch",
        organizationId: "org-1",
      }).success
    ).toBe(true);
    expect(
      taskLabelCreateSchema.safeParse({
        color: "violet",
        name: "Launch",
        organizationId: "org-1",
      }).success
    ).toBe(false);
  });
});
