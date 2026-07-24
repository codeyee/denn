import { test, expect } from "./support/test";
import type {
  APIRequestContext,
  BrowserContext,
  Page,
} from "@playwright/test";

const fixtureUrl = "http://127.0.0.1:18000";
const fixtureUser = {
  email: "phase0@example.test",
  password: "fixture-password",
};

async function resetFixture(request: APIRequestContext) {
  await request.post(`${fixtureUrl}/__fixture__/reset`);
}

async function authenticate(
  context: BrowserContext,
  access = "fixture-access",
) {
  await context.addCookies([
    {
      name: "auth-token",
      value: access,
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
}

function captureUnexpectedConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" ||
      /React error #418|hydration (failed|mismatch)|uncaught/i.test(text)
    ) {
      errors.push(text);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ request }) => {
  await resetFixture(request);
});

test("login honors next and reaches id-first detail without hydration errors", async ({
  page,
}) => {
  const consoleErrors = captureUnexpectedConsole(page);

  await page.goto("/content/1");
  await expect(page).toHaveURL(/\/login\?next=%2Fcontent%2F1/);

  await page.getByLabel("Email").fill(fixtureUser.email);
  await page.getByLabel("Password").fill(fixtureUser.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/content\/1$/);
  await expect(
    page.getByText("Deterministic metadata for browser guardrails."),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("authenticated cold and warm navigation covers critical routes", async ({
  context,
  page,
}) => {
  await authenticate(context);

  await page.goto("/");
  await expect(page.getByLabel("Profile")).toBeVisible();
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign In" })).toHaveCount(0);

  await page.goto("/search?q=phase");
  await expect(
    page.getByRole("heading", { name: "Movies" }),
  ).toBeVisible();
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();

  await page
    .getByRole("button", { name: "View details for Phase Zero Movie" })
    .click();
  await expect(page).toHaveURL(/\/content\/1$/);
  await expect(
    page.getByText("Deterministic metadata for browser guardrails."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Deterministic metadata for browser guardrails."),
  ).toBeVisible();

  await page.goto("/lists/1");
  await expect(page.getByText("Phase 0 Fixture List").first()).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByText("phase0@example.test")).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("one navigation keeps a bounded request id across web, core and proxy", async ({
  context,
  page,
  request,
}) => {
  await authenticate(context);
  await context.setExtraHTTPHeaders({
    "X-Request-Id": "phase0-correlation-01",
  });

  const response = await page.goto("/");
  expect(response?.headers()["x-request-id"]).toBe("phase0-correlation-01");

  const recorded = await request.get(`${fixtureUrl}/__fixture__/requests`);
  const requests = (await recorded.json()) as Array<{
    service: string;
    path: string;
    request_id: string;
    consumer: string | null;
  }>;
  const downstream = requests.filter(({ path }) => path.startsWith("/api/") || path.startsWith("/v1/"));

  expect(downstream.length).toBeGreaterThanOrEqual(3);
  expect(new Set(downstream.map(({ request_id }) => request_id))).toEqual(
    new Set(["phase0-correlation-01"]),
  );
  expect(
    downstream.find(({ service }) => service === "proxy")?.consumer,
  ).toBe("web");
});

test("expired access token refreshes once and preserves the protected route", async ({
  context,
  page,
  request,
}) => {
  await authenticate(context, "expired-access");
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  const recorded = await request.get(`${fixtureUrl}/__fixture__/requests`);
  const requests = (await recorded.json()) as Array<{
    method: string;
    path: string;
  }>;
  expect(
    requests.filter(({ path }) => path === "/api/auth/token/refresh/"),
  ).toHaveLength(1);
});

test("BFF exposes bounded cache states and server timing", async ({
  request,
}) => {
  const miss = await request.get("/api/proxy/homepage?limit=12");
  expect(miss.headers()["x-cache"]).toBe("MISS");
  expect(miss.headers()["server-timing"]).toContain('desc="MISS"');

  const hit = await request.get("/api/proxy/homepage?limit=12");
  expect(hit.headers()["x-cache"]).toBe("HIT");
  expect(hit.headers()["server-timing"]).toContain('desc="HIT"');

  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { cacheStatus: "STALE" },
  });
  const stale = await request.get("/api/proxy/homepage?limit=12");
  expect(stale.headers()["x-cache"]).toBe("STALE");
  expect(stale.headers()["server-timing"]).toContain('desc="STALE"');
});
