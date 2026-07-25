import { describe, expect, it } from "vitest";

import { getRouter } from "@/router";

describe("TanStack router boot", () => {
  it("builds with the expected route tree", () => {
    const router = getRouter();
    const paths = Object.keys(router.routesById);

    expect(paths).toContain("/");
    expect(paths).toContain("/login");
    expect(paths).toContain("/register");
    expect(paths).not.toContain("/profile");
    expect(paths).toContain("/settings");
    expect(paths).toContain("/search");
    expect(paths).toContain("/content/$id");
    expect(paths).toContain("/lists/$id");
    expect(paths).toContain("/user/$username");
  });
});
