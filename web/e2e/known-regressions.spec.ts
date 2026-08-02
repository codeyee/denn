import { test, expect } from "./support/test";
import { fixtureUrl } from "./support/fixture";

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

test("hover does not mutate persisted content @regression", async ({
  page,
  request,
}) => {
  await page.goto("/search?q=phase");
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(450);
  const initial = await request.get(`${fixtureUrl}/__fixture__/requests`);
  const initialRequests = (await initial.json()) as Array<{
    method: string;
    path: string;
  }>;
  expect(
    initialRequests.filter(
      ({ method, path }) =>
        method === "POST" && path === "/api/content/resolve-ids/",
    ),
  ).toHaveLength(1);
  await request.post(`${fixtureUrl}/__fixture__/reset`);
  await page
    .getByRole("link", { name: "View details for Phase Zero Movie" })
    .hover();
  await page.waitForTimeout(350);

  const recorded = await request.get(`${fixtureUrl}/__fixture__/requests`);
  const requests = (await recorded.json()) as Array<{
    method: string;
    path: string;
  }>;
  const hoverMutations = requests.filter(
    ({ method, path }) =>
      method === "POST" && path.startsWith("/api/content/"),
  );
  expect(hoverMutations).toHaveLength(0);
});

for (const sourceRoute of ["/", "/search?q=phase"]) {
  test(`hover preview preserves mouse navigation from ${sourceRoute} @regression`, async ({
    page,
  }) => {
    await page.goto(sourceRoute);
    const allDetailLinks = page.getByRole("link", {
      name: "View details for Phase Zero Movie",
    });
    const detailLink = sourceRoute === "/"
      ? page
          .locator('section[aria-roledescription="carousel"]')
          .filter({
            has: page.getByRole("heading", {
              name: "Popular Movies",
              exact: true,
            }),
          })
          .getByRole("link", { name: "View details for Phase Zero Movie" })
          .first()
      : allDetailLinks.first();
    await expect(detailLink).toHaveCount(1);
    await detailLink.scrollIntoViewIfNeeded();

    const cardBounds = await detailLink.boundingBox();
    expect(cardBounds).not.toBeNull();
    if (!cardBounds) return;

    const cardCenter = {
      x: cardBounds.x + cardBounds.width / 2,
      y: cardBounds.y + cardBounds.height / 2,
    };
    await page.mouse.move(cardCenter.x, cardCenter.y);
    await expect(page.locator("[data-card-hover-popover]")).toBeVisible();
    await page.mouse.click(cardCenter.x, cardCenter.y);

    await expect(page).toHaveURL(/\/content\/1$/);
  });
}

test("hover preview keeps the add-to-list action interactive @regression", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1_000 });
  await page.goto("/search?q=phase");
  await page
    .getByRole("link", { name: "View details for Phase Zero Movie" })
    .hover();
  await page.getByRole("button", { name: "Add to List" }).click();

  await expect(
    page.getByRole("heading", { name: "Add to List" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/search\?q=phase$/);
});

test("hover preview closes on scroll and stays aligned through resize @regression", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1_000 });
  await page.goto("/");
  const carousel = page
    .locator('section[aria-roledescription="carousel"]')
    .filter({ has: page.getByRole("heading", { name: "Popular Movies" }) });
  const cardLink = carousel
    .getByRole("link", { name: "View details for Phase Zero Movie" })
    .first();
  await cardLink.scrollIntoViewIfNeeded();
  await cardLink.hover();

  const preview = page.locator("[data-card-hover-popover]");
  await expect(preview).toBeVisible();
  await expectPreviewAligned(page, cardLink, preview);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expectPreviewAligned(page, cardLink, preview);

  await expect(preview).toHaveCSS("overflow-y", "hidden");
  const initialScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 120);
  await expect(preview).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(initialScrollY);
});

for (const detailDelayMs of [500, 2_000, 6_500]) {
  test(`content navigation exposes feedback within 100ms with ${detailDelayMs}ms latency @regression`, async ({
    page,
    request,
  }) => {
    test.setTimeout(detailDelayMs + 15_000);
    await page.goto("/search?q=phase");
    await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();
    await request.post(`${fixtureUrl}/__fixture__/scenario`, {
      data: { detailDelayMs },
    });

    const feedbackMs = await measureNavigationFeedback(page);
    expect(feedbackMs).toBeLessThan(100);
    await expect(page).toHaveURL(/\/content\/1$/);
    await expect(
      page.getByRole("heading", { name: "Movies" }),
    ).toHaveCount(0);

    if (detailDelayMs > 5_000) {
      await expect(
        page.getByRole("heading", { name: "Could not open this content" }),
      ).toBeVisible({ timeout: detailDelayMs + 2_000 });
      await request.post(`${fixtureUrl}/__fixture__/scenario`, {
        data: { detailDelayMs: 0 },
      });
      await page.getByRole("button", { name: "Retry" }).click();
    }

    await expect(
      page.getByText("Deterministic metadata for browser guardrails."),
    ).toBeVisible({ timeout: detailDelayMs + 5_000 });
    await page.waitForLoadState("networkidle");

    const recorded = await request.get(`${fixtureUrl}/__fixture__/requests`);
    const requests = (await recorded.json()) as Array<{
      method: string;
      path: string;
    }>;
    expect(
      requests.filter(
        ({ method, path }) =>
          method === "GET" && path === "/api/content/1/",
      ).length,
    ).toBe(detailDelayMs > 5_000 ? 2 : 1);
    expect(
      requests.filter(
        ({ method, path }) =>
          method === "GET" && path === "/api/content/ratings/",
      ).length,
    ).toBeLessThanOrEqual(1);
  });
}

test("failed detail navigation exposes retry and preserves session @regression", async ({
  page,
  request,
}) => {
  await page.goto("/search?q=phase");
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();
  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { detailStatus: 500 },
  });

  await measureNavigationFeedback(page);
  await expect(
    page.getByRole("heading", { name: "Could not open this content" }),
  ).toBeVisible();
  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { detailStatus: 200 },
  });
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByText("Deterministic metadata for browser guardrails."),
  ).toBeVisible();
});

test("base accessibility contract keeps zoom, landmarks and touch targets @regression", async ({
  page,
}) => {
  await page.goto("/");

  const viewport = await page
    .locator('meta[name="viewport"]')
    .getAttribute("content");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale=1");
  await expect(page.locator("main")).toHaveCount(1);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

  const profileBox = await page
    .getByRole("button", { name: "Open @phase0-fixture menu" })
    .boundingBox();
  expect(profileBox?.width).toBeGreaterThanOrEqual(44);
  expect(profileBox?.height).toBeGreaterThanOrEqual(44);
});

test("a valid session survives a transient core 5xx @regression", async ({
  context,
  page,
  request,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Account settings" }),
  ).toBeVisible();
  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { coreMode: "unavailable" },
  });
  await page.reload();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Service unavailable" }),
  ).toBeVisible();
  expect((await context.cookies()).map(({ name }) => name)).toEqual(
    expect.arrayContaining(["auth-token", "refresh-token"]),
  );

  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { coreMode: "normal" },
  });
  await page.getByRole("button", { name: "Retry session check" }).click();
  await expect(
    page.getByRole("heading", { name: "Account settings" }),
  ).toBeVisible();
});

test("logout reaches the public home without a redirect loop @regression", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Account settings" }),
  ).toBeVisible();
  await page
    .locator("main")
    .getByRole("button", { name: "Logout", exact: true })
    .click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
});

test("a valid session reaches a recoverable timeout state @regression", async ({
  page,
  request,
}) => {
  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { coreMode: "slow" },
  });
  await page.goto("/settings");

  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Session check timed out" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry session check" }),
  ).toBeVisible();
});

test("critical SPA navigation has no React 418 hydration error @regression", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (/React error #418|hydration (failed|mismatch)/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();
  await page.goto("/search?q=phase");
  await expect(page.getByRole("heading", { name: "Movies" })).toBeVisible();
  await page.goto("/content/1");
  await expect(
    page.getByText("Deterministic metadata for browser guardrails."),
  ).toBeVisible();
  await page.goto("/lists/1");
  await expect(page.getByText("Phase 0 Fixture List").first()).toBeVisible();
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Account settings" }),
  ).toBeVisible();
  await page.waitForTimeout(100);

  expect(hydrationErrors).toEqual([]);
});

test("failure artifacts contain trace, screenshot and redacted network log @artifact-check", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_VERIFY_FAILURE_ARTIFACTS !== "1",
    "Run pnpm test:e2e:artifact-check to verify retained failure artifacts.",
  );

  await page.goto("/");
  expect("deliberate artifact probe").toBe("failure");
});

async function measureNavigationFeedback(page: import("@playwright/test").Page) {
  return page
    .getByRole("link", { name: "View details for Phase Zero Movie" })
    .evaluate(
      (element) =>
        new Promise<number>((resolve, reject) => {
          const startedAt = performance.now();
          const timeout = window.setTimeout(() => {
            observer.disconnect();
            reject(new Error("navigation feedback was not rendered"));
          }, 500);
          const observer = new MutationObserver(() => {
            if (!document.querySelector('[role="status"]')) return;
            window.clearTimeout(timeout);
            observer.disconnect();
            resolve(performance.now() - startedAt);
          });
          observer.observe(document.body, { childList: true, subtree: true });
          (element as HTMLElement).click();
        }),
    );
}

async function expectPreviewAligned(
  page: import("@playwright/test").Page,
  card: import("@playwright/test").Locator,
  preview: import("@playwright/test").Locator,
) {
  await expect
    .poll(async () => {
      const [cardBox, previewBox, viewport] = await Promise.all([
        card.boundingBox(),
        preview.boundingBox(),
        page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
        })),
      ]);
      if (!cardBox || !previewBox) return null;
      return {
        alignedLeft: Math.abs(cardBox.x - previewBox.x) <= 1,
        alignedWidth: Math.abs(cardBox.width - previewBox.width) <= 1,
        withinHorizontalViewport:
          previewBox.x >= 16 &&
          previewBox.x + previewBox.width <= viewport.width - 16,
        withinVerticalViewport:
          previewBox.y >= 16 &&
          previewBox.y + previewBox.height <= viewport.height - 16,
      };
    })
    .toEqual({
      alignedLeft: true,
      alignedWidth: true,
      withinHorizontalViewport: true,
      withinVerticalViewport: true,
    });
}
