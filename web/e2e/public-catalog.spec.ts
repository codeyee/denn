import { expect, test } from "./support/test";
import {
  fetchFixtureRequests,
  resetFixture,
} from "./support/fixture";

test.beforeEach(async ({ context, request }) => {
  await resetFixture(request);
  await context.clearCookies();
});

test("anonymous visitors can explore the catalog and stable content detail", async ({
  page,
  request,
}) => {
  const directCoreRequests: string[] = [];
  const browserRequestsWithApiKey: string[] = [];
  page.on("request", (browserRequest) => {
    const url = new URL(browserRequest.url());
    if (
      url.hostname === "localhost" &&
      url.port === "8000" &&
      url.pathname.startsWith("/api/")
    ) {
      directCoreRequests.push(browserRequest.url());
    }
    if ("x-api-key" in browserRequest.headers()) {
      browserRequestsWithApiKey.push(browserRequest.url());
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Explore the Denn catalog" }),
  ).toBeVisible();
  const booksHeading = page.getByRole("heading", {
    name: "Popular Books",
  });
  await expect(booksHeading).toBeVisible();
  await expect(booksHeading.locator("svg")).toHaveCount(1);
  await expect(page.getByText("Your Lists")).toHaveCount(0);
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await expect(
      page.getByRole("button", { name: "Open search" }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByPlaceholder("Search for movies, TV shows, games...").first(),
    ).toBeVisible();
  }

  await page.goto("/search?q=phase");
  for (const title of ["Movies", "TV Shows", "Games", "Music", "Books"]) {
    const heading = page.getByRole("heading", { name: title });
    await expect(heading).toBeVisible();
    await expect(heading.locator("svg")).toHaveCount(1);
  }
  await expect(page.getByText("Phase Zero Movie").first()).toBeVisible();

  await page
    .getByRole("link", { name: /View details for Phase Zero Movie/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/content\/1$/);
  await expect(
    page.getByRole("heading", { name: "Phase Zero Movie" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Add to List/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rate This/i })).toBeVisible();

  const requests = await fetchFixtureRequests(request);
  const homepageRequest = requests.find(
    (entry) =>
      entry.service === "proxy" &&
      entry.method === "GET" &&
      entry.path === "/v1/proxy/homepage",
  );
  expect(new URLSearchParams(homepageRequest?.query ?? "").get("limit")).toBe(
    "30",
  );
  const catalogResolution = requests.find(
    (entry) =>
      entry.service === "core" &&
      entry.method === "POST" &&
      entry.path === "/api/content/resolve-ids/",
  );
  expect(catalogResolution?.consumer).toBe("web");
  const publicDetailRequests = requests.filter(
    (entry) =>
      entry.service === "core" &&
      entry.method === "GET" &&
      entry.path === "/api/content/1/",
  );
  expect(publicDetailRequests.length).toBeGreaterThan(0);
  expect(
    publicDetailRequests.every(
      (entry) =>
        entry.consumer === "web" &&
        /^[0-9a-f]{64}$/.test(entry.catalog_visitor ?? ""),
    ),
  ).toBe(true);
  expect(
    new Set(publicDetailRequests.map((entry) => entry.catalog_visitor)).size,
  ).toBe(1);
  expect(directCoreRequests).toEqual([]);
  expect(browserRequestsWithApiKey).toEqual([]);
});

test("personal catalog actions preserve the anonymous visitor's return path", async ({
  page,
}) => {
  await page.goto("/content/1");
  await page.getByRole("button", { name: /Add to List/i }).click();

  await expect(page).toHaveURL(/\/login\?next=%2Fcontent%2F1$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Denn" }),
  ).toBeVisible();
  await expect(page.locator("header")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Create one/i })).toHaveAttribute(
    "href",
    "/register?next=%2Fcontent%2F1",
  );
});

test("content without artwork keeps its title and personal actions usable", async ({
  page,
}) => {
  await page.goto("/content/2");

  await expect(
    page.getByRole("heading", { name: "No Artwork Movie" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Add to List/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rate This/i })).toBeVisible();
});

test("the retired welcome route uses the standard not-found experience", async ({ page }) => {
  const response = await page.goto("/welcome");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Return home" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Explore the Denn catalog" }),
  ).toBeVisible();
});

test("account-only routes remain protected", async ({ page }) => {
  await page.goto("/profile");

  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/);
});
