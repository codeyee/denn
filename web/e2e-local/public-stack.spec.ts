import { expect, test } from "@playwright/test";

test("the public app uses the local BFF without exposing internal credentials", async ({
  page,
}, testInfo) => {
  const directServiceRequests: string[] = [];
  const requestsWithApiKey: string[] = [];
  const runtimeErrors: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (["core", "proxy"].includes(url.hostname)) {
      directServiceRequests.push(request.url());
    }
    if ("x-api-key" in request.headers()) {
      requestsWithApiKey.push(request.url());
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (/hydration (failed|mismatch)|uncaught/i.test(text)) {
      runtimeErrors.push(text);
    }
  });

  const healthResponse = await page.request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  expect(await healthResponse.json()).toEqual({
    service: "web",
    status: "ok",
  });

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Explore the Denn catalog" }),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder("Search for movies, TV shows, games...").first(),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  const versionResponse = await page.request.get("/api/version");
  expect(versionResponse.status()).toBe(200);
  expect(await versionResponse.json()).toEqual(
    expect.objectContaining({ service: "web" }),
  );

  await page.screenshot({
    path: testInfo.outputPath("local-public-home.png"),
    fullPage: true,
  });

  expect(directServiceRequests).toEqual([]);
  expect(requestsWithApiKey).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
