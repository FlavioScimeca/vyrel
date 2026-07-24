import { describe, expect, it } from "@jest/globals";

import { formatMediumDate } from "./format-date";

describe("formatMediumDate", () => {
  it("formats date-only values without parsing them as UTC instants", () => {
    const expected = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(2026, 6, 24));

    expect(formatMediumDate("2026-07-24")).toBe(expected);
  });

  it("leaves invalid values readable", () => {
    expect(formatMediumDate("not-a-date")).toBe("not-a-date");
  });
});
