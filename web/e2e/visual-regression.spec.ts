import type { Locator, Page } from "@playwright/test";

import { resetFixture } from "./support/fixture";
import { expect, test } from "./support/test";

const VISUAL_ROUTES = [
  "/login",
  "/",
  "/content/1",
  "/user/phase0-fixture",
  "/search?q=phase",
] as const;

const AUTH_COOKIES = [
  {
    name: "auth-token",
    value: "fixture-access",
    domain: "127.0.0.1",
    path: "/",
    sameSite: "Lax" as const,
    httpOnly: true,
  },
  {
    name: "refresh-token",
    value: "fixture-refresh",
    domain: "127.0.0.1",
    path: "/",
    sameSite: "Lax" as const,
    httpOnly: true,
  },
];

test.beforeEach(async ({ context, request }) => {
  await resetFixture(request);
  await context.addCookies(AUTH_COOKIES);
});

for (const route of VISUAL_ROUTES) {
  test(`visual baseline stays stable for ${route}`, async ({
    context,
    page,
  }) => {
    if (route === "/login") {
      await context.clearCookies();
    }

    await page.addInitScript(() => {
      let seed = 0xdecafbad;
      Math.random = () => {
        seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
        return seed / 2 ** 32;
      };
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expectRouteReady(page, route);

    const region = getStableRegion(page, route);
    await expect(region).toBeVisible();
    await waitForVisualStability(page, region);
    if (route !== "/") {
      await expectNoHorizontalOverflow(page);
    }
    await expectResponsiveStructure(page, route);

    await expect(region).toHaveScreenshot(`${routeSlug(route)}.png`, {
      animations: "disabled",
      caret: "hide",
      scale: "css",
    });
  });
}

async function expectRouteReady(
  page: Page,
  route: (typeof VISUAL_ROUTES)[number],
) {
  const readyRegion = {
    "/login": page.getByRole("heading", { name: "Sign in to Denn" }),
    "/": page.getByRole("region", { name: "Featured content" }),
    "/content/1": page.getByText(
      "Deterministic metadata for browser guardrails.",
    ),
    "/user/phase0-fixture": page.getByRole("heading", {
      name: "@phase0-fixture",
      exact: true,
    }),
    "/search?q=phase": page.getByRole("heading", {
      name: "Movies",
      exact: true,
    }),
  }[route];

  await expect(readyRegion).toBeVisible();
}

function getStableRegion(page: Page, route: (typeof VISUAL_ROUTES)[number]) {
  if (route === "/login") {
    return page.getByRole("region", { name: "Sign in" });
  }
  if (route === "/") {
    return page.getByRole("region", { name: "Featured content" });
  }
  if (route === "/search?q=phase") {
    return page
      .locator('section[aria-roledescription="carousel"]')
      .filter({
        has: page.getByRole("heading", { name: "Movies", exact: true }),
      })
      .first();
  }
  return page.locator("[data-banner-shell]").first();
}

async function waitForVisualStability(page: Page, region: Locator) {
  await region.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await region.locator("img").evaluateAll(async (images) => {
    await Promise.all(
      images.map(
        (image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                const finish = () => resolve();
                image.addEventListener("load", finish, { once: true });
                image.addEventListener("error", finish, { once: true });
              }),
      ),
    );
  });

  const brokenImages = await region.locator("img").evaluateAll((images) =>
    images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.alt || image.src),
  );
  expect(brokenImages, "Visual region must finish loading its images").toEqual(
    [],
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectResponsiveStructure(
  page: Page,
  route: (typeof VISUAL_ROUTES)[number],
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Visual projects must define a viewport");

  if (viewport.width < 768 && route !== "/login" && route !== "/search?q=phase") {
    const banner = page.locator("[data-banner-shell]").first();
    const bannerBox = await banner.boundingBox();
    expect(bannerBox, "Banner must be visible in the visual matrix").not.toBeNull();

    const expectedHeight = await banner.evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).height),
    );
    expect(Math.abs((bannerBox?.height ?? 0) - expectedHeight)).toBeLessThanOrEqual(1);
    expect((bannerBox?.height ?? 0) / (bannerBox?.width ?? 1)).toBeGreaterThan(1);
    expect(bannerBox?.x ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(0);
    expect(
      (bannerBox?.x ?? 0) + (bannerBox?.width ?? 0),
    ).toBeLessThanOrEqual(viewport.width + 1);

    const [navbarBox, bannerContentBox] = await Promise.all([
      page.locator("header .layout-content").boundingBox(),
      banner.locator(".layout-banner-content").boundingBox(),
    ]);
    expect(navbarBox, "Navbar content must be visible").not.toBeNull();
    expect(bannerContentBox, "Banner content must be visible").not.toBeNull();
    expect(
      Math.abs((navbarBox?.x ?? 0) - (bannerContentBox?.x ?? 0)),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs((navbarBox?.width ?? 0) - (bannerContentBox?.width ?? 0)),
    ).toBeLessThanOrEqual(1);
  }

  if (route === "/search?q=phase") {
    const cardBox = await page
      .getByRole("link", { name: "View details for Phase Zero Movie" })
      .first()
      .boundingBox();
    expect(cardBox, "Search card must be visible").not.toBeNull();
    expect(
      Math.abs((cardBox?.width ?? 0) / (cardBox?.height ?? 1) - 5 / 8),
    ).toBeLessThan(0.03);
  }

  if (viewport.width < 600) {
    const controls =
      route === "/login"
        ? [page.getByRole("button", { name: "Sign In", exact: true })]
        : [
            ...(route === "/"
              ? []
              : [page.getByRole("button", { name: "Open search" })]),
            page.getByRole("button", {
              name: "Open @phase0-fixture menu",
            }),
          ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box, "Primary mobile control must be visible").not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  }
}

function routeSlug(route: (typeof VISUAL_ROUTES)[number]) {
  return {
    "/login": "login",
    "/": "home",
    "/content/1": "content-1",
    "/user/phase0-fixture": "profile-phase0-fixture",
    "/search?q=phase": "search-phase",
  }[route];
}
