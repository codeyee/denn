import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { fixtureUrl } from "./support/fixture";

const criticalRoutes = [
  "/",
  "/search?q=phase",
  "/content/1",
  "/lists/1",
  "/settings",
  "/user/phase0-fixture",
  "/user/empty-user",
  "/lists/3",
  "/login",
  "/register",
  "/not-a-real-route",
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
});

for (const route of criticalRoutes) {
  test(`${route} has one main, one h1 and no serious axe violations`, async ({
    context,
    page,
  }) => {
    if (route === "/login" || route === "/register") {
      await context.clearCookies();
    }
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
  const activeHeroUrl = await hero.locator("img").getAttribute("src");
  const optimizedUrls = [
    ...new Set(
      [
        ...imageEntries
          .filter(({ startTime }) => startTime < 1_000)
          .map(({ name }) => name),
        ...(activeHeroUrl ? [activeHeroUrl] : []),
      ],
    ),
  ];
  const bannerUrls = [1, 2, 3].map(
    (index) =>
      `${fixtureUrl}/__fixture__/images/banner-${index}.svg`,
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

test("featured carousel navigates, pauses and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const initialTitle = await activeFeaturedTitle(page);
  await page
    .getByRole("button", { name: "Show next featured item" })
    .click();
  expect(await activeFeaturedTitle(page)).not.toBe(initialTitle);
  await page
    .getByRole("button", { name: "Show previous featured item" })
    .click();
  expect(await activeFeaturedTitle(page)).toBe(initialTitle);

  const next = page.getByRole("button", {
    name: "Show next featured item",
  });
  await next.focus();
  await page.keyboard.press("ArrowRight");
  expect(await activeFeaturedTitle(page)).not.toBe(initialTitle);

  const pause = page.getByRole("button", { name: "Pause featured content" });
  await pause.click();
  const pausedTitle = await activeFeaturedTitle(page);
  await page.waitForTimeout(5_250);
  expect(await activeFeaturedTitle(page)).toBe(pausedTitle);
  await page
    .getByRole("button", { name: "Resume featured content" })
    .click();

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

test("mobile first viewport exposes featured content and the next section", async ({
  page,
}) => {
  const viewport = { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const featuredRegion = page.getByRole("region", {
    name: "Featured content",
  });
  const featured = await featuredRegion.boundingBox();
  const nextSection = await page
    .getByRole("heading", { name: "Your Lists" })
    .boundingBox();
  const featuredTitle = featuredRegion.getByRole("heading", { level: 2 });
  await expect(
    featuredRegion.getByRole("img", { name: "Content type: Movie" }),
  ).toBeVisible();

  expect(featured, "Featured content must be visible").not.toBeNull();
  expect(featured?.y ?? viewport.height).toBeLessThan(viewport.height);
  expect(nextSection, "The next content section must be rendered").not.toBeNull();
  expect(nextSection?.y ?? viewport.height).toBeLessThan(viewport.height);
  await expect(
    featuredRegion.getByText("Deterministic metadata for browser guardrails."),
  ).toHaveCount(0);
  const titleBox = await featuredTitle.boundingBox();
  const previousBox = await page
    .getByRole("button", { name: "Show previous featured item" })
    .boundingBox();
  const nextBox = await page
    .getByRole("button", { name: "Show next featured item" })
    .boundingBox();
  expect(rectanglesOverlap(previousBox, titleBox)).toBe(false);
  expect(rectanglesOverlap(nextBox, titleBox)).toBe(false);
  await expect(
    page
      .getByRole("region", { name: "Popular Movies" })
      .getByText("Fixture Studio One, Fixture Studio Two & 1 more")
      .first(),
  ).toBeVisible();
});

test("primary mobile controls keep 44px targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const tabs = await page.getByRole("tab").all();
  const controls = [
    page.getByRole("button", { name: "Open search" }),
    page.getByRole("button", { name: "Show previous featured item" }),
    page.getByRole("button", { name: "Show next featured item" }),
    ...tabs,
  ];

  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box, "Primary control must be visible").not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("authentication stays centered and viewport-bound without navigation or scrolling", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  const cases = [
    { route: "/login", viewport: { width: 360, height: 640 } },
    { route: "/register", viewport: { width: 360, height: 640 } },
    { route: "/login", viewport: { width: 1440, height: 900 } },
    { route: "/register", viewport: { width: 1440, height: 900 } },
  ];

  for (const { route, viewport } of cases) {
    await page.setViewportSize(viewport);
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("header, footer, nav")).toHaveCount(0);
    await expect(page.locator(".auth-mosaic-grid")).toHaveCount(1);
    await expect(page.locator(".auth-mosaic-tile").first()).toBeVisible();
    await expect(page.locator("h1 + p")).toHaveCSS("text-align", "center");

    const layout = await page.evaluate(() => {
      const panel = document.querySelector("main > section");
      const panelRect = panel?.getBoundingClientRect();

      return {
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        panelTop: panelRect?.top ?? 0,
        panelBottom: panelRect ? window.innerHeight - panelRect.bottom : 0,
      };
    });

    expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight);
    expect(Math.abs(layout.panelTop - layout.panelBottom)).toBeLessThanOrEqual(
      1,
    );
    expect(layout.panelTop).toBeGreaterThanOrEqual(0);
    expect(layout.panelBottom).toBeGreaterThanOrEqual(0);
  }
});

test("authenticated visitors are redirected away from authentication routes", async ({
  page,
}) => {
  for (const route of ["/login", "/register"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Your Denn home" }),
    ).toBeVisible();
  }
});

test("navbar shows the Denn logo and a solid focused user menu", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Denn home" }).locator("img"),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Open @phase0-fixture menu" })
    .click();
  const userMenu = page.locator("[data-user-menu]");
  await expect(userMenu).toBeVisible();
  await expect(userMenu).toHaveCSS("background-color", "rgb(29, 19, 28)");
  await expect(userMenu.getByText("Account settings")).toHaveCount(0);
  await expect(userMenu.getByText("Enable Animations")).toHaveCount(0);
});

test("public profile tabs support keyboard navigation, reduced motion and 44px targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/user/phase0-fixture");

  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(3);
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Progress" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/tab=progress/);

  for (const tab of await tabs.all()) {
    const box = await tab.boundingBox();
    expect(box, "Profile tab must be visible").not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("owner profile editor keeps focus inside the dialog and returns it on close", async ({
  page,
}) => {
  await page.goto("/user/phase0-fixture");
  const editButton = page.getByRole("button", { name: "Edit profile" });

  await editButton.click();
  const dialog = page.getByRole("dialog", { name: "Edit public profile" });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    ({ impact }) => impact === "critical" || impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(editButton).toBeFocused();
});

test("desktop featured controls stay clear of the title", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const featured = page.getByRole("region", { name: "Featured content" });
  await featured.hover();

  const titleBox = await featured.getByRole("heading", { level: 2 }).boundingBox();
  const previousBox = await featured
    .getByRole("button", { name: "Show previous featured item" })
    .boundingBox();
  const nextBox = await featured
    .getByRole("button", { name: "Show next featured item" })
    .boundingBox();

  expect(rectanglesOverlap(previousBox, titleBox)).toBe(false);
  expect(rectanglesOverlap(nextBox, titleBox)).toBe(false);
});

test("content carousel accepts horizontal gestures and keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: "Popular Movies" }) });
  const scroller = carousel.locator("[data-carousel-scroller]");
  await expect
    .poll(() =>
      scroller.evaluate((node) => getComputedStyle(node).scrollbarWidth),
    )
    .toBe("none");
  await scroller.hover();
  await page.mouse.wheel(220, 0);
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);

  await scroller.evaluate((node) => node.scrollTo({ left: 0 }));
  const next = carousel.getByRole("button", { name: "View next content" });
  await next.focus();
  await expect(next).toBeFocused();
  await next.press("Enter");
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
  await expect(
    carousel.getByRole("button", { name: "View previous content" }),
  ).toBeVisible();
  await expect(next).toBeFocused();
});

test("home, detail and profile banners keep a balanced height and upper focal point", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const route of ["/", "/content/1", "/user/phase0-fixture"]) {
    await page.goto(route);
    const banner = page.locator("[data-banner-shell]").first();
    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(671);
    expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(673);
    await expectBannerContentAlignment(page, banner);
    await expect(banner.locator("img").first()).toHaveCSS(
      "object-position",
      "50% 35%",
    );
  }

  for (const width of [1800, 2000]) {
    await page.setViewportSize({ width, height: 1400 });
    await page.goto("/content/1");
    const detailBanner = page.locator("[data-banner-shell]").first();
    const detailBox = await detailBanner.boundingBox();
    const detailContentBox = await detailBanner
      .locator(".layout-banner-content")
      .boundingBox();
    expect(detailBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(detailBox?.width ?? 0).toBeGreaterThanOrEqual(width - 1);
    expect(
      (detailContentBox?.x ?? 0) - (detailBox?.x ?? 0),
    ).toBeGreaterThanOrEqual(47);
    await expectBannerContentAlignment(page, detailBanner);
    await expectBannerSideFade(detailBanner, "0");
  }

  for (const width of [2200, 2560, 5000]) {
    await page.setViewportSize({ width, height: 1400 });
    await page.goto("/content/1");
    const detailBanner = page.locator("[data-banner-shell]").first();
    const detailBox = await detailBanner.boundingBox();
    expect(detailBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      2048,
    );
    expect(
      Math.abs(
        (detailBox?.x ?? 0) -
          (width - (detailBox?.width ?? width)) / 2,
      ),
    ).toBeLessThanOrEqual(1);
    await expectBannerContentAlignment(page, detailBanner);
    await expectBannerSideFade(detailBanner, "1");
  }
});

test("home carousel uses the wide container and keeps card width bounded at 5000px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 5000, height: 1400 });
  await page.goto("/");
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: "Popular Movies" }) });
  const scroller = carousel.locator("[data-carousel-scroller]");
  const firstSlide = scroller.locator('[role="group"]').first();

  await expect
    .poll(async () => (await firstSlide.boundingBox())?.width ?? 0)
    .toBeLessThanOrEqual(300);

  const carouselBox = await carousel.boundingBox();
  expect(carouselBox?.width ?? 0).toBeGreaterThanOrEqual(4900);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("desktop card previews release horizontal trackpad scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: "Popular Movies" }) });
  const scroller = carousel.locator("[data-carousel-scroller]");

  await scroller.evaluate((node) => {
    const firstSlide = node.querySelector('[role="group"]');
    if (firstSlide) node.appendChild(firstSlide.cloneNode(true));
  });
  await scroller.locator('[role="group"]').first().hover();
  const preview = page.locator("[data-card-hover-popover]").last();
  await expect(preview).toBeVisible();

  await preview.dispatchEvent("wheel", { deltaX: 220, deltaY: 0 });
  await expect(preview).toBeHidden();
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
});

test("search result carousels accept horizontal trackpad gestures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search?q=phase");
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: "Movies" }) });
  const scroller = carousel.locator("[data-carousel-scroller]");

  await scroller.hover();
  await page.mouse.wheel(220, 0);
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
});

test("shared content carousels keep circular controls while fades follow real boundaries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expectCircularNavigation(page, "Popular Movies");

  await page.goto("/search?q=phase");
  await expectCircularNavigation(page, "Movies");

  await page.setViewportSize({ width: 5000, height: 1400 });
  await page.goto("/");
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: "Popular Movies" }) });
  const scroller = carousel.locator("[data-carousel-scroller]");
  await ensureCarouselItemCount(scroller, 24);
  const next = carousel.getByRole("button", { name: "View next content" });
  await expect(next).toBeVisible();
  const [nextBox, contentBox] = await Promise.all([
    next.boundingBox(),
    carousel.locator(".layout-carousel-content").boundingBox(),
  ]);
  const contentRight = (contentBox?.x ?? 0) + (contentBox?.width ?? 0);
  const nextRight = (nextBox?.x ?? 0) + (nextBox?.width ?? 0);
  expect(
    Math.abs(nextRight - contentRight),
  ).toBeLessThanOrEqual(49);
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

function rectanglesOverlap(
  first: { x: number; y: number; width: number; height: number } | null,
  second: { x: number; y: number; width: number; height: number } | null,
) {
  if (!first || !second) return true;
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

async function expectBannerContentAlignment(
  page: Page,
  banner: Locator,
) {
  const navbarContent = page.locator("header .layout-content");
  const bannerContent = banner.locator(".layout-banner-content");
  const [navbarBox, contentBox] = await Promise.all([
    navbarContent.boundingBox(),
    bannerContent.boundingBox(),
  ]);

  expect(navbarBox, "Navbar content must be visible").not.toBeNull();
  expect(contentBox, "Banner content must be visible").not.toBeNull();
  expect(
    Math.abs((navbarBox?.x ?? 0) - (contentBox?.x ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs((navbarBox?.width ?? 0) - (contentBox?.width ?? 0)),
  ).toBeLessThanOrEqual(1);
}

async function expectBannerSideFade(banner: Locator, opacity: string) {
  await expect
    .poll(() =>
      banner.evaluate(
        (node) => getComputedStyle(node, "::after").opacity,
      ),
    )
    .toBe(opacity);
  const backgroundImage = await banner.evaluate(
    (node) => getComputedStyle(node, "::after").backgroundImage,
  );
  expect(backgroundImage).toContain("linear-gradient");
  expect(backgroundImage).not.toBe("none");
}

async function expectCircularNavigation(page: Page, title: string) {
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  const scroller = carousel.locator("[data-carousel-scroller]");
  await ensureCarouselItemCount(scroller, 8);
  await scroller.evaluate((node) => node.scrollTo({ left: 0 }));

  const previous = carousel.getByRole("button", {
    name: "View previous content",
  });
  const next = carousel.getByRole("button", { name: "View next content" });
  const previousEdge = carousel.locator('[data-carousel-edge="previous"]');
  const nextEdge = carousel.locator('[data-carousel-edge="next"]');

  await expect(previous).toBeVisible();
  await expect(next).toBeVisible();
  await expect(previous).toHaveCSS("opacity", "0.8");
  await expect(next).toHaveCSS("opacity", "0.8");
  await expect(previousEdge).toHaveCount(0);
  await expect(nextEdge).toBeVisible();
  await expect(nextEdge).toHaveCSS("pointer-events", "none");
  const [previousBox, nextBox] = await Promise.all([
    previous.boundingBox(),
    next.boundingBox(),
  ]);
  expect(previousBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(17);
  expect(
    390 - ((nextBox?.x ?? 0) + (nextBox?.width ?? 0)),
  ).toBeLessThanOrEqual(17);

  await previous.click();
  await expect(scroller).toHaveAttribute(
    "data-carousel-wrap-phase",
    /outgoing|incoming/,
  );
  await expect
    .poll(() =>
      scroller.evaluate(
        (node) => node.scrollWidth - node.clientWidth - node.scrollLeft,
      ),
    )
    .toBeLessThanOrEqual(2);
  await expect(scroller).not.toHaveAttribute("data-carousel-wrap-phase");
  await expect(previous).toBeVisible();
  await expect(next).toBeVisible();
  await expect(previousEdge).toBeVisible();
  await expect(previousEdge).toHaveCSS("pointer-events", "none");
  await expect(nextEdge).toHaveCount(0);

  await next.click();
  await expect(scroller).toHaveAttribute(
    "data-carousel-wrap-phase",
    /outgoing|incoming/,
  );
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollLeft))
    .toBeLessThanOrEqual(2);
  await expect(scroller).not.toHaveAttribute("data-carousel-wrap-phase");
  await expect(previous).toBeVisible();
  await expect(next).toBeVisible();
  await expect(next).toBeFocused();
  await expect(previousEdge).toHaveCount(0);
  await expect(nextEdge).toBeVisible();

  await next.click();
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(2);
  await expect(previousEdge).toBeVisible();
  await expect(nextEdge).toBeVisible();

  await scroller.evaluate((node) => {
    const items = Array.from(node.querySelectorAll('[role="group"]'));
    items.slice(1).forEach((item) => item.remove());
  });
  await expect(previous).toHaveCount(0);
  await expect(next).toHaveCount(0);
  await expect(carousel.locator("[data-carousel-edge]")).toHaveCount(0);
}

async function ensureCarouselItemCount(scroller: Locator, count: number) {
  await scroller.evaluate((node, targetCount) => {
    const firstItem = node.querySelector('[role="group"]');
    if (!firstItem) return;
    while (node.querySelectorAll('[role="group"]').length < targetCount) {
      node.appendChild(firstItem.cloneNode(true));
    }
  }, count);
}
