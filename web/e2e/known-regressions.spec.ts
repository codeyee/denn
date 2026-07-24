import { test, expect } from "./support/test";

const fixtureUrl = "http://127.0.0.1:18000";

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
      ),
    ).toHaveLength(1);
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

  const profileBox = await page.getByLabel("Profile").boundingBox();
  expect(profileBox?.width).toBeGreaterThanOrEqual(44);
  expect(profileBox?.height).toBeGreaterThanOrEqual(44);
});

test("a valid session survives a transient core 5xx @regression", async ({
  context,
  page,
  request,
}) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { coreMode: "unavailable" },
  });
  await page.reload();

  await expect(page).toHaveURL(/\/profile$/);
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
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
});

test("logout reaches the public home without a redirect loop @regression", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await page.locator("button").filter({ hasText: "Logout" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
});

test("a valid session reaches a recoverable timeout state @regression", async ({
  page,
  request,
}) => {
  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { coreMode: "slow" },
  });
  await page.goto("/profile");

  await expect(page).toHaveURL(/\/profile$/);
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
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
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
