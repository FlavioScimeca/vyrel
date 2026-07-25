import { describe, expect, it } from "vitest";

import {
  EXTENSION_SESSION_COOKIE_HEADER,
  headersWithExtensionSessionCookie,
} from "./extension-session-cookie";

describe("headersWithExtensionSessionCookie", () => {
  it("leaves headers unchanged without the extension cookie header", () => {
    const headers = new Headers({ cookie: "a=1" });
    expect(headersWithExtensionSessionCookie(headers)).toBe(headers);
  });

  it("copies the extension header onto Cookie", () => {
    const headers = new Headers({
      [EXTENSION_SESSION_COOKIE_HEADER]: "better-auth.session_token=abc",
    });
    const next = headersWithExtensionSessionCookie(headers);
    expect(next).not.toBe(headers);
    expect(next.get("cookie")).toBe("better-auth.session_token=abc");
  });
});
