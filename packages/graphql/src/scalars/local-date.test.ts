import { Kind } from "graphql";
import { describe, expect, it } from "vitest";

import { GraphQLLocalDate } from "./local-date";

describe("GraphQLLocalDate", () => {
  it("round-trips valid date-only values", () => {
    expect(GraphQLLocalDate.parseValue("2028-02-29")).toBe("2028-02-29");
    expect(GraphQLLocalDate.serialize("2028-02-29")).toBe("2028-02-29");
    expect(
      GraphQLLocalDate.parseLiteral(
        { kind: Kind.STRING, value: "2026-12-01" },
        undefined
      )
    ).toBe("2026-12-01");
  });

  it.each([
    "2026-02-29",
    "2026-00-10",
    "2026-1-10",
  ])("rejects invalid value %s", (value) => {
    expect(() => GraphQLLocalDate.parseValue(value)).toThrow();
  });

  it("rejects non-string literals", () => {
    expect(() =>
      GraphQLLocalDate.parseLiteral(
        { kind: Kind.INT, value: "20260101" },
        undefined
      )
    ).toThrow("LocalDate must be a string.");
  });
});
