import { describe, expect, it } from "vitest";

import {
  isValidPayload,
  normalizeMetricRoute,
} from "@/routes/api/perf/vitals";
import { normalizeRequestId } from "@/server/proxy";

describe("request correlation", () => {
  it("accepts bounded correlation ids", () => {
    expect(normalizeRequestId("browser:nav-01.trace_02")).toBe(
      "browser:nav-01.trace_02",
    );
  });

  it("rejects ids that leak PII or create uncontrolled cardinality", () => {
    expect(normalizeRequestId("user@example.com navigation")).toBeNull();
    expect(normalizeRequestId("x".repeat(129))).toBeNull();
  });
});

describe("web vital ingestion", () => {
  it("accepts bounded cold/warm navigation dimensions", () => {
    expect(
      isValidPayload({
        name: "LCP",
        value: 1234,
        rating: "good",
        route: "/content/123",
        browser_state: "cold",
        navigation_type: "navigate",
      }),
    ).toBe(true);
  });

  it("normalizes dynamic routes before logging", () => {
    expect(normalizeMetricRoute("/content/123")).toBe("/content/:id");
    expect(normalizeMetricRoute("/lists/99?sort=-added_at")).toBe(
      "/lists/:id",
    );
    expect(normalizeMetricRoute("/user/user@example.com")).toBe("/other");
  });

  it("rejects uncontrolled telemetry dimensions", () => {
    expect(
      isValidPayload({
        name: "LCP",
        value: 1234,
        route: "/",
        browser_state: "user-123",
      }),
    ).toBe(false);
  });
});
