import { describe, expect, it, vi } from "vitest";

const token = "a".repeat(64);

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => token,
}));

import { validateCsrfRequest } from "@/server/csrf";

describe("BFF CSRF validation", () => {
  it("accepts same-origin double-submit tokens", () => {
    const request = new Request("https://denn.example/api/auth/logout", {
      method: "POST",
      headers: {
        Origin: "https://denn.example",
        "Sec-Fetch-Site": "same-origin",
        "X-CSRF-Token": token,
      },
    });

    expect(validateCsrfRequest(request)).toBe(true);
  });

  it("rejects missing, mismatched, and cross-site submissions", () => {
    expect(
      validateCsrfRequest(
        new Request("https://denn.example/api/auth/logout", {
          method: "POST",
          headers: { "X-CSRF-Token": "b".repeat(64) },
        }),
      ),
    ).toBe(false);
    expect(
      validateCsrfRequest(
        new Request("https://denn.example/api/auth/logout", {
          method: "POST",
          headers: {
            Origin: "https://evil.example",
            "Sec-Fetch-Site": "cross-site",
            "X-CSRF-Token": token,
          },
        }),
      ),
    ).toBe(false);
  });
});
