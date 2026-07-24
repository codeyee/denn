import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "./support/test";

const fixtureUrl = "http://127.0.0.1:18000";
const criticalRoutes = [
  "/",
  "/search?q=phase",
  "/content/1",
  "/lists/1",
  "/profile",
  "/login",
  "/register",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
];

test.beforeEach(async ({ context, request }) => {
  await request.post(`${fixtureUrl}/__fixture__/reset`);
  await context.addCookies([
    {
      name: "auth-token",
      value: "fixture-access",
      domain: "127.0.0.1",
      path: "/",
      sameSite: "Lax",
    },
    {
      name: "refresh-token",
      value: "fixture-refresh",
      domain: "127.0.0.1",
      path: "/",
      sameSite: "Lax",
    },
  ]);
});

for (const route of criticalRoutes) {
  test(`${route} has one main, one h1 and no serious axe violations`, async ({
    page,
  }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

test("home mounts semantic responsive media without hidden hero slides", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hero = page.getByRole("region", { name: "Featured content" });
  await expect(hero.getByRole("heading")).toHaveCount(1);
  await expect(hero.locator("img")).toHaveCount(1);
  await expect(hero.locator('img[fetchpriority="high"]')).toHaveCount(1);
  await expect(page.locator('img[loading="lazy"]').first()).toBeAttached();
  const imageEntries = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter(
        (entry) =>
          (entry as PerformanceResourceTiming).initiatorType === "img" &&
          entry.name.includes("/__fixture__/images/"),
      )
      .map((entry) => ({ name: entry.name, startTime: entry.startTime })),
  );
  const optimizedUrls = [
    ...new Set(
      imageEntries
        .filter(({ startTime }) => startTime < 1_000)
        .map(({ name }) => name),
    ),
  ];
  const bannerUrls = [1, 2, 3].map(
    (index) =>
      `http://127.0.0.1:18000/__fixture__/images/banner-${index}.svg`,
  );
  const initialBannerUrls = optimizedUrls.filter((url) =>
    bannerUrls.includes(url),
  );
  expect(initialBannerUrls).toHaveLength(1);
  const hiddenSlideUrls = bannerUrls.filter(
    (url) => !initialBannerUrls.includes(url),
  );
  for (const entry of imageEntries.filter(({ name }) =>
    hiddenSlideUrls.includes(name),
  )) {
    expect(entry.startTime).toBeGreaterThanOrEqual(4_500);
  }
  const legacyUrls = [...optimizedUrls, ...hiddenSlideUrls];
  const measureBytes = async (urls: string[]) =>
    (
      await Promise.all(
        urls.map(
          async (url) => (await (await request.get(url)).body()).byteLength,
        ),
      )
    ).reduce((total, bytes) => total + bytes, 0);
  const mediaBudget = {
    optimized: {
      requests: optimizedUrls.length,
      payloadBytes: await measureBytes(optimizedUrls),
    },
    legacyHiddenSlidesMounted: {
      requests: legacyUrls.length,
      payloadBytes: await measureBytes(legacyUrls),
    },
  };

  await testInfo.attach("home-media-budget.json", {
    body: Buffer.from(`${JSON.stringify(mediaBudget, null, 2)}\n`),
    contentType: "application/json",
  });
  expect(mediaBudget.optimized.requests).toBe(4);
  expect(mediaBudget.optimized.payloadBytes).toBeLessThan(
    mediaBudget.legacyHiddenSlidesMounted.payloadBytes,
  );
});

test("featured carousel pauses, uses one tab stop and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause featured carousel" });
  await pause.click();
  const title = await activeFeaturedTitle(page);
  await page.waitForTimeout(5_250);
  expect(await activeFeaturedTitle(page)).toBe(title);

  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(3);
  expect(await tabs.evaluateAll((elements) =>
    elements.filter((element) => element.getAttribute("tabindex") === "0").length,
  )).toBe(1);
  await page.getByRole("tab", { selected: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedTitle = await activeFeaturedTitle(page);
  await page.waitForTimeout(5_250);
  expect(await activeFeaturedTitle(page)).toBe(reducedTitle);
});

test("mobile search opens, receives focus, closes and reaches results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open search" }).click();
  const input = page.getByRole("searchbox", { name: /Search movies/ });
  await expect(input).toBeFocused();
  await input.fill("phase");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=phase/);
  await expect(page.getByRole("heading", { name: "Movies" })).toBeVisible();

  await page.getByRole("button", { name: "Open search" }).click();
  await page.getByRole("button", { name: "Close search" }).click();
  await expect(page.locator("#mobile-navbar-search")).toHaveCount(0);
});

test("primary mobile controls keep 44px targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const tabs = await page.getByRole("tab").all();
  const controls = [
    page.getByRole("button", { name: "Open search" }),
    page.getByRole("button", { name: "Pause featured carousel" }),
    ...tabs,
  ];

  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box, "Primary control must be visible").not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("content carousel scrolls without losing keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: "Popular Movies" }) });
  const scroller = carousel.locator(".overflow-x-auto");
  const next = carousel.getByRole("button", { name: "Next items" });
  await next.focus();
  await next.press("Enter");
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
  await expect(next).toBeFocused();
});

test("landscape and 200-percent-equivalent reflow remain usable", async ({
  page,
}) => {
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 320, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("button", { name: "Open search" })).toBeVisible();
  }
});

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`home has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("footer routes support navigation, metadata and hard refresh", async ({
  page,
}) => {
  await page.goto("/");
  for (const label of ["About", "Privacy", "Terms", "Contact"]) {
    const link = page.getByRole("link", { name: label, exact: true }).last();
    await expect(link).not.toHaveAttribute("href", "#");
  }

  await page.getByRole("link", { name: "Privacy", exact: true }).last().click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "/privacy",
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();

  await page.goto("/missing-page");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});

async function activeFeaturedTitle(page: Page) {
  return page
    .getByRole("region", { name: "Featured content" })
    .locator("h2")
    .innerText();
}
