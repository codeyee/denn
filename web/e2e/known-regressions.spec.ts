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

test("hover does not mutate persisted content @known-regression", async ({
  page,
  request,
}) => {
  test.fail(
    true,
    "Issue #20: the current card prefetch resolves an id with POST get_or_create.",
  );

  await page.goto("/search?q=phase");
  await page
    .getByRole("button", { name: "View details for Phase Zero Movie" })
    .hover();
  await page.waitForTimeout(350);

  const recorded = await request.get(`${fixtureUrl}/__fixture__/requests`);
  const requests = (await recorded.json()) as Array<{
    method: string;
    path: string;
  }>;
  const hoverMutations = requests.filter(
    ({ method, path }) =>
      method === "POST" && path === "/api/content/items/get_or_create/",
  );
  expect(hoverMutations).toHaveLength(0);
});

test("a valid session survives a transient core 5xx @known-regression", async ({
  context,
  page,
  request,
}) => {
  test.fail(
    true,
    "Issue #18: the auth-store rehydration race redirects unavailable sessions to login.",
  );

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
});

test("logout reaches the public home without a redirect loop @known-regression", async ({
  page,
}) => {
  test.fail(
    true,
    "Issue #18: clearing the client session from a protected route can recursively redirect /login.",
  );

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await page.locator("button").filter({ hasText: "Logout" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
});

test("a valid session reaches a recoverable timeout state @known-regression", async ({
  page,
  request,
}) => {
  test.fixme(
    true,
    "Issue #18: the app has no bounded auth-bootstrap timeout or recoverable timeout UI yet.",
  );

  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { coreMode: "slow" },
  });
  await page.goto("/profile");

  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByRole("heading", { name: "Service unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("critical SPA navigation has no React 418 hydration error @known-regression", async ({
  page,
}) => {
  test.fixme(
    true,
    "Issue #17: React #418 is intermittent; keep this scenario quarantined until auth hydration is repaired.",
  );
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
