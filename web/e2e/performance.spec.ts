import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { BrowserContext, Page } from "@playwright/test";

import { test, expect } from "./support/test";

interface Sample {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  inp: number;
}

interface Summary {
  samples: number;
  p50: Sample;
  p75: Sample;
  p95: Sample;
}

const fixtureUrl = "http://127.0.0.1:18000";
const flows = {
  login: "/login",
  home: "/",
  search: "/search?q=phase",
  detail: "/content/1",
  lists: "/lists/1",
  profile: "/profile",
};

async function installObservers(page: Page) {
  await page.addInitScript(() => {
    const values = { lcp: 0, cls: 0, inp: 0 };
    Object.defineProperty(window, "__phase0Metrics", {
      configurable: true,
      value: values,
    });

    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) values.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) values.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        values.inp = Math.max(values.inp, entry.duration);
      }
    }).observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
  });
}

async function addAuthCookies(context: BrowserContext) {
  await context.addCookies([
    {
      name: "auth-token",
      value: "fixture-access",
      domain: "127.0.0.1",
      path: "/",
      sameSite: "Lax",
      httpOnly: true,
    },
    {
      name: "refresh-token",
      value: "fixture-refresh",
      domain: "127.0.0.1",
      path: "/",
      sameSite: "Lax",
      httpOnly: true,
    },
  ]);
}

async function capture(page: Page, path: string): Promise<Sample> {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.locator("body").click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(750);

  return page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const fcp = performance
      .getEntriesByName("first-contentful-paint")
      .at(-1)?.startTime ?? 0;
    const values = (
      window as typeof window & {
        __phase0Metrics: { lcp: number; cls: number; inp: number };
      }
    ).__phase0Metrics;
    return {
      ttfb: navigation.responseStart,
      fcp,
      lcp: values.lcp,
      cls: values.cls,
      inp: values.inp,
    };
  });
}

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(
    0,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  );
  return Math.round(sorted[index] * 100) / 100;
}

function summarize(samples: Sample[]): Summary {
  const metric = (name: keyof Sample, p: number) =>
    percentile(samples.map((sample) => sample[name]), p);
  const at = (p: number): Sample => ({
    ttfb: metric("ttfb", p),
    fcp: metric("fcp", p),
    lcp: metric("lcp", p),
    cls: metric("cls", p),
    inp: metric("inp", p),
  });
  return {
    samples: samples.length,
    p50: at(50),
    p75: at(75),
    p95: at(95),
  };
}

test("records a repeatable cold/warm production-build baseline", async ({
  browser,
  request,
}, testInfo) => {
  await request.post(`${fixtureUrl}/__fixture__/reset`);
  const baseline: Record<
    string,
    { cold: Summary; warm: Summary }
  > = {};

  for (const [flow, path] of Object.entries(flows)) {
    const cold: Sample[] = [];
    const warm: Sample[] = [];

    for (let iteration = 0; iteration < 5; iteration += 1) {
      if (flow === "home") {
        await request.post(`${fixtureUrl}/__fixture__/scenario`, {
          data: { cacheStatus: "MISS" },
        });
      }
      const context = await browser.newContext();
      if (flow !== "login") await addAuthCookies(context);
      const page = await context.newPage();
      await installObservers(page);
      cold.push(await capture(page, path));
      warm.push(await capture(page, path));
      await context.close();
    }

    baseline[flow] = {
      cold: summarize(cold),
      warm: summarize(warm),
    };
  }

  const output = resolve("test-results/phase0-baseline.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  await testInfo.attach("phase0-baseline.json", {
    path: output,
    contentType: "application/json",
  });

  expect(Object.keys(baseline)).toEqual(Object.keys(flows));
  expect(baseline.home.cold.p75.cls).toBeLessThan(0.1);
  expect(baseline.home.warm.p75.cls).toBeLessThan(0.1);
  expect(baseline.home.cold.p75.lcp).toBeLessThan(2_500);
  expect(baseline.home.warm.p75.lcp).toBeLessThan(2_500);
  expect(baseline.home.cold.p75.inp).toBeLessThan(200);
  expect(baseline.home.warm.p75.inp).toBeLessThan(200);
});
