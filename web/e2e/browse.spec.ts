import { expect, test } from "./support/test";
import { fetchFixtureRequests, resetFixture } from "./support/fixture";

const families = [
  ["movies", "Movies"],
  ["tv-shows", "TV Shows"],
  ["games", "Games"],
  ["music", "Music"],
  ["books", "Books"],
] as const;

test.beforeEach(async ({ context, request }) => {
  await resetFixture(request);
  await context.clearCookies();
});

test("home places family browse actions beside carousel titles", async ({ page }) => {
  await page.goto("/");

  const movies = page.getByRole("region", { name: "Popular Movies" });
  const books = page.getByRole("region", { name: "Popular Books" });

  await expect(movies.getByRole("heading", { name: "Popular Movies" })).toBeVisible();
  await expect(movies.getByRole("link", { name: "View all movies" })).toHaveAttribute(
    "href",
    "/browse/movies",
  );
  await expect(books.getByRole("link", { name: "View all books" })).toHaveAttribute(
    "href",
    "/browse/books",
  );
  await expect(page.locator("header").getByRole("link", { name: "Browse", exact: true })).toHaveCount(0);
});

test("anonymous users can browse every public family without leaking server calls", async ({
  page,
  request,
}) => {
  const browserApiKeys: string[] = [];
  const browserInternalRequests: string[] = [];
  page.on("request", (browserRequest) => {
    const url = new URL(browserRequest.url());
    const headers = browserRequest.headers();
    if ("x-api-key" in headers) browserApiKeys.push(browserRequest.url());
    if (
      url.port === "18080" ||
      (url.port === "18000" && url.pathname.startsWith("/api/")) ||
      url.pathname.includes("/content/resolve-ids")
    ) {
      browserInternalRequests.push(browserRequest.url());
    }
  });

  for (const [slug, heading] of families) {
    await page.goto(`/browse/${slug}`);
    await expect(page.getByRole("heading", { name: `Browse ${heading}` })).toBeVisible();
    await expect(page.locator("#navbar-search")).toHaveCount(0);
    await expect(
      page.getByRole("searchbox", {
        name: `Search ${heading.toLowerCase()}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /View details for/i }).first()).toBeVisible();
  }

  const fixtureRequests = await fetchFixtureRequests(request);
  expect(fixtureRequests.filter((entry) => entry.path === "/v1/proxy/browse").length).toBe(5);
  expect(
    fixtureRequests.filter(
      (entry) => entry.service === "core" && entry.method === "POST" && entry.path === "/api/content/resolve-ids/",
    ).length,
  ).toBe(5);
  expect(browserApiKeys).toEqual([]);
  expect(browserInternalRequests).toEqual([]);
});

test("browse searches automatically after typing settles", async ({ page }) => {
  await page.goto("/browse/movies");
  await page.getByRole("searchbox", { name: "Search movies", exact: true }).fill("Phase Zero");

  await expect(page).toHaveURL(/\/browse\/movies\?q=Phase\+Zero$/, {
    timeout: 2_000,
  });
  await expect(page.getByText("Search results are ordered by relevance.")).toBeVisible();
});

test("global search settles automatically and links to family browse", async ({ page }) => {
  await page.goto("/search");
  await page.locator("#navbar-search:visible, #mobile-search:visible").first().fill("Phase");

  await expect(page).toHaveURL(/\/search\?q=Phase$/, { timeout: 2_000 });
  await expect(page.getByRole("link", { name: "View all movies" })).toHaveAttribute(
    "href",
    "/browse/movies?q=Phase",
  );
});

test("browse supports search, sort, pagination, keyboard and normalized URLs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/browse/movies?sort=recent");

  await expect(page.getByRole("button", { name: "Recent" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("searchbox", { name: "Search movies", exact: true }).fill("Phase Zero");
  await page.getByRole("button", { name: "Search", exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/browse\/movies\?q=Phase\+Zero$/);
  await expect(page.getByText("Search results are ordered by relevance.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recent" })).toHaveCount(0);

  await page.goto("/browse/movies");
  await expect(page.getByRole("link", { name: "Next" })).toBeVisible();
  await page.getByRole("link", { name: "Next" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/browse\/movies\?page=2$/);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();

  await page.goto(`/browse/music?page=0&sort=invalid&q=${"x".repeat(81)}`);
  await expect(page.getByRole("heading", { name: "Browse Music" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/browse\/music$/,
  );
});

test("browse cards navigate to id-first detail and do not resolve on hover", async ({ page, request }) => {
  const browserResolutionPosts: string[] = [];
  page.on("request", (browserRequest) => {
    if (
      browserRequest.method() === "POST" &&
      browserRequest.url().includes("/api/content/resolve-ids/")
    ) {
      browserResolutionPosts.push(browserRequest.url());
    }
  });

  await page.goto("/browse/movies");
  const card = page.getByRole("link", { name: /View details for Phase Zero Movie/i }).first();
  await card.hover();
  await card.focus();
  await expect(page.getByRole("heading", { name: "Browse Movies" })).toBeVisible();
  expect(browserResolutionPosts).toEqual([]);

  await card.click();
  await expect(page).toHaveURL(/\/content\/1$/);
  const fixtureRequests = await fetchFixtureRequests(request);
  expect(
    fixtureRequests.some(
      (entry) => entry.service === "core" && entry.method === "POST" && entry.path === "/api/content/resolve-ids/",
    ),
  ).toBe(true);
});
