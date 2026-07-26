import { describe, expect, it } from "vitest";

import { healthResponse } from "@/routes/api/health";

describe("web health route", () => {
  it("returns a cheap no-store readiness response", async () => {
    const response = healthResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      service: "web",
      status: "ok",
    });
  });
});
