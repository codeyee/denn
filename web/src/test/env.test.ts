import { describe, expect, it } from "vitest";

import { getApiUrl } from "@/lib/env";

describe("server API URL resolution", () => {
  it("prefers the server-only API_URL", () => {
    expect(
      getApiUrl({
        API_URL: "http://core:8000/api",
        NEXT_PUBLIC_API_URL: "https://legacy.example.test/api",
      }),
    ).toBe("http://core:8000/api");
  });

  it("accepts the legacy deployment variable without exposing it to Window", () => {
    expect(
      getApiUrl({
        NEXT_PUBLIC_API_URL: "https://legacy.example.test/api",
      }),
    ).toBe("https://legacy.example.test/api");
  });

  it("keeps the local development fallback", () => {
    expect(getApiUrl({})).toBe("http://localhost:8000/api");
  });
});
