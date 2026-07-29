import { test, expect } from "./support/test";
import type {
  APIRequestContext,
  BrowserContext,
  Page,
} from "@playwright/test";
import { fixtureUrl } from "./support/fixture";

const fixtureUser = {
  email: "phase0@example.test",
  password: "fixture-password",
};
const fixtureBuildSha = "f".repeat(40);

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

function captureUnexpectedConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" ||
      /React error #418|hydration (failed|mismatch)|uncaught/i.test(text)
    ) {
      errors.push(`${page.url()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  return errors;
}

test.beforeEach(async ({ request }) => {
  await resetFixture(request);
});

test("release probe exposes the exact non-cacheable web commit", async ({
  request,
}) => {
  const response = await request.get("/api/version");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({
    service: "web",
    sha: fixtureBuildSha,
  });
});

test("authenticated visitors cannot reopen login or registration", async ({
  context,
  page,
}) => {
  await authenticate(context);

  for (const route of ["/login", "/register"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Your Denn home" }),
    ).toBeVisible();
  }
});

test("a personal action honors next and returns to public id-first detail", async ({
  page,
}) => {
  const consoleErrors = captureUnexpectedConsole(page);

  await page.goto("/content/1");
  await expect(page).toHaveURL(/\/content\/1$/);
  await expect(
    page.getByText("Deterministic metadata for browser guardrails."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Add to List/i }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcontent%2F1/);

  await page.getByLabel("Email").fill(fixtureUser.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(fixtureUser.password);
  const loginStartedAt = Date.now();
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign In" }).click();
  const loginResponse = await loginResponsePromise;

  await expect(page).toHaveURL(/\/content\/1$/);
  await page.goto("/content/1");
  await expect(
    page.getByText("Deterministic metadata for browser guardrails."),
  ).toBeVisible();
  expect(Date.now() - loginStartedAt).toBeLessThan(1_500);
  await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
  const loginPayload = (await loginResponse.json()) as Record<string, unknown>;
  expect(loginPayload).not.toHaveProperty("access");
  expect(loginPayload).not.toHaveProperty("refresh");

  const authCookies = (await page.context().cookies()).filter(({ name }) =>
    ["auth-token", "refresh-token"].includes(name),
  );
  expect(authCookies).toHaveLength(2);
  expect(authCookies.every(({ httpOnly }) => httpOnly)).toBe(true);
  expect(authCookies.every(({ sameSite }) => sameSite === "Lax")).toBe(true);
  expect(
    await page.evaluate(() => ({
      cookies: document.cookie,
      storage: localStorage.getItem("auth-storage") ?? "",
    })),
  ).toEqual(
    expect.objectContaining({
      cookies: expect.not.stringMatching(/auth-token|refresh-token/),
      storage: expect.not.stringMatching(/access|refresh|eyJ/),
    }),
  );
  expect(consoleErrors).toEqual([]);
});

test("public profile, tabs and public navigation work anonymously", async ({
  page,
  request,
}) => {
  const consoleErrors = captureUnexpectedConsole(page);
  await page.goto("/user/phase0-fixture");
  await expect(
    page.getByRole("heading", { name: "@phase0-fixture" }),
  ).toBeVisible();
  await expect(page.getByText("Stories across every medium.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit profile" })).toHaveCount(0);
  const recordedProfileReads = await request.get(
    `${fixtureUrl}/__fixture__/requests`,
  );
  const profileReads = (await recordedProfileReads.json()) as Array<{
    service: string;
    path: string;
  }>;
  expect(
    profileReads.some(({ path }) => path === "/api/profiles/phase0-fixture/"),
  ).toBe(true);
  expect(profileReads.some(({ service }) => service === "proxy")).toBe(false);

  await page.getByRole("tab", { name: "Progress" }).click();
  await expect(page).toHaveURL(/tab=progress/);
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();

  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("link", { name: "Open list Public Fixture Picks" }).click();
  await expect(page).toHaveURL(/\/lists\/3$/);
  await expect(
    page.getByRole("heading", { name: "Public Fixture Picks" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "View details for Phase Zero Movie" }).click();
  await expect(page).toHaveURL(/\/content\/1$/);
  await expect(page.getByText("Track this content")).toHaveCount(0);
  const privateList = await request.get("/api/core/content/lists/4/");
  expect(privateList.status()).toBe(404);
  expect(consoleErrors).toEqual([]);
});

test("profile favorites combine score order with multi-select type filters", async ({
  page,
}) => {
  await page.goto("/user/phase0-fixture");
  const favorites = page.getByRole("region", { name: "Favorites" });
  const filterNames = ["Movies", "TV Shows", "Games", "Music", "Books"];

  for (const name of filterNames) {
    const filter = favorites.getByRole("button", { name });
    await expect(filter).toHaveAttribute("aria-pressed", "false");
    await expect(filter.locator("svg")).toHaveCount(1);
  }

  await expect
    .poll(() =>
      favorites
        .getByRole("link")
        .evaluateAll((links) =>
          links.map((link) => link.getAttribute("aria-label")),
        ),
    )
    .toEqual([
      "View details for Phase Zero Game",
      "View details for Phase Zero Movie",
      "View details for Phase Zero Book",
    ]);

  await favorites.getByRole("button", { name: "Movies" }).click();
  await expect(
    favorites.getByRole("link", {
      name: "View details for Phase Zero Movie",
    }),
  ).toBeVisible();
  await expect(
    favorites.getByRole("link", {
      name: "View details for Phase Zero Game",
    }),
  ).toHaveCount(0);

  await favorites.getByRole("button", { name: "Games" }).click();
  await expect(
    favorites.getByRole("link", {
      name: "View details for Phase Zero Game",
    }),
  ).toBeVisible();
  await expect(
    favorites.getByRole("link", {
      name: "View details for Phase Zero Book",
    }),
  ).toHaveCount(0);

  await favorites.getByRole("button", { name: "Movies" }).click();
  await favorites.getByRole("button", { name: "Games" }).click();
  await expect(favorites.getByRole("link")).toHaveCount(3);
});

test("profile progress and list filters stay canonical", async ({
  page,
}) => {
  await page.goto(
    "/user/phase0-fixture?tab=progress&page=2&reviewed=true&favorite=true&minScore=7&maxScore=10&sort=score&order=desc",
  );
  await expect(page.getByRole("heading", { name: "Progress", level: 2 })).toBeVisible();
  await expect(page.getByText("2/2")).toBeVisible();
  const progressFilters = page.getByRole("form", { name: "Filter profile progress" });
  await progressFilters.getByRole("button", { name: /Favorite/ }).click();
  await page.getByRole("menuitemradio", { name: "Not favorites" }).click();
  await expect(page).toHaveURL(/favorite=false/);
  await progressFilters.getByRole("button", { name: /Sort criterion/ }).click();
  await page.getByRole("menuitemradio", { name: "Title" }).click();
  await expect(page).toHaveURL(/sort=title/);
  await page.getByRole("button", { name: "Go to next page" }).click();
  await expect(page).toHaveURL(/page=2/);

  await page.getByRole("tab", { name: "Lists" }).click();
  await page.getByLabel("Search lists").fill("public");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=public/);
  await page.getByLabel("List role").selectOption("member");
  await expect(page).toHaveURL(/role=member/);
  await expect(page).toHaveURL(/page=1/);
  await page.getByLabel("Sort order").selectOption("name");
  await expect(page).toHaveURL(/sort=name/);
});

test("broken public avatar falls back to initials", async ({ page, request }) => {
  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { brokenAvatar: true },
  });
  await page.goto("/user/phase0-fixture");
  await expect(
    page.getByRole("img", { name: "phase0-fixture's avatar" }),
  ).toBeVisible();
});

test("public profile renders empty and not-found states", async ({ page }) => {
  await page.goto("/user/empty-user");
  await expect(page.getByRole("heading", { name: "@empty-user" })).toBeVisible();
  await expect(page.getByText("No public favorites yet.")).toBeVisible();

  await page.goto("/user/missing-user");
  await expect(
    page.getByRole("heading", { name: "This user does not exist." }),
  ).toBeVisible();
});

test("owner edits public bio and avatar from the public profile modal", async ({
  context,
  page,
}) => {
  await authenticate(context);
  await page.goto("/user/phase0-fixture");

  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit public profile" }),
  ).toBeVisible();
  await page.getByLabel("Bio").fill("Updated from the public profile modal.");
  await page
    .getByLabel("Avatar URL")
    .fill("https://example.com/fixture-avatar.jpg");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Edit public profile" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Updated from the public profile modal."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit profile" })).toBeVisible();
});

test("personal tracking completes, rates, reviews and handles favorite quota", async ({
  context,
  page,
  request,
}) => {
  await authenticate(context);
  await page.goto("/content/1");
  await page.getByLabel("Tracking status").selectOption("completed");
  await expect(
    page.getByRole("heading", { name: "Rate This Content" }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Rating" }).fill("8.5");
  await page.getByLabel("Review (Optional)").fill("A tracked fixture review.");
  await page
    .getByLabel("Hide this review behind a spoiler warning")
    .check();
  await page.getByRole("button", { name: "Submit Rating" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Rating", exact: true }),
  ).toBeVisible();

  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { favoriteLimit: true },
  });
  await page.getByRole("button", { name: "Add favorite" }).click();
  await expect(page.getByText(/Favorite limit reached/)).toBeVisible();

  await request.post(`${fixtureUrl}/__fixture__/scenario`, {
    data: { favoriteLimit: false },
  });
  await page.getByRole("button", { name: "Add favorite" }).click();
  await expect(page.getByRole("button", { name: "Favorite" })).toBeVisible();
});

test("authenticated cold and warm navigation covers critical routes", async ({
  context,
  page,
}) => {
  await authenticate(context);

  await page.goto("/");
  await page.getByRole("button", {
    name: "Open @phase0-fixture menu",
  }).click();
  const profileLink = page.getByRole("link", {
    name: "View profile",
  });
  await expect(profileLink).toBeVisible();
  await profileLink.click();
  await expect(page).toHaveURL(/\/user\/phase0-fixture/);
  await expect(
    page.getByRole("heading", { name: "@phase0-fixture" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);

  await page.goto("/search?q=phase");
  await expect(
    page.getByRole("heading", { name: "Movies" }),
  ).toBeVisible();
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();

  await page
    .getByRole("link", { name: "View details for Phase Zero Movie" })
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

  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Account settings" }),
  ).toBeVisible();
  await expect(page.getByText("phase0@example.test")).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("adult search stays safe by default and changes only after explicit opt-in", async ({
  context,
  page,
}) => {
  await authenticate(context);

  await page.goto("/search?q=phase");
  await expect(
    page.getByText("Adult content is filtered from direct search."),
  ).toBeVisible();
  await expect(page.getByText("Explicit Opt-In Result")).toHaveCount(0);

  await page.goto("/settings");
  const preference = page.getByRole("checkbox", {
    name: "Allow adult content in direct search",
  });
  await expect(preference).not.toBeChecked();
  await preference.check();
  await expect(preference).toBeChecked();
  await expect(preference).toBeEnabled();

  await page.goto("/search?q=phase");
  await expect(
    page.getByText("Adult content is included in direct search"),
  ).toBeVisible();
  await expect(page.getByText("Explicit Opt-In Result").first()).toBeVisible();
});

test("logout everywhere clears the local session and reaches the blacklist endpoint", async ({
  context,
  page,
  request,
}) => {
  await authenticate(context);
  await page.goto("/settings");

  await page.getByRole("button", { name: "Logout everywhere" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  const authCookieNames = (await context.cookies()).map(({ name }) => name);
  expect(authCookieNames).not.toContain("auth-token");
  expect(authCookieNames).not.toContain("refresh-token");

  const recorded = await request.get(`${fixtureUrl}/__fixture__/requests`);
  const requests = (await recorded.json()) as Array<{ path: string }>;
  expect(requests.some(({ path }) => path === "/api/auth/logout-all/")).toBe(
    true,
  );
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
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Account settings" }),
  ).toBeVisible();

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
