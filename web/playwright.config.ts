import { defineConfig, devices } from "@playwright/test";

const fixtureCoreUrl = "http://127.0.0.1:18000";
const fixtureProxyUrl = "http://127.0.0.1:18080";
const appUrl = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/artifacts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["line"],
    ["html", { open: "never", outputFolder: "test-results/report" }],
  ],
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "node e2e/fixtures/server.mjs",
      url: `${fixtureCoreUrl}/__fixture__/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command:
        `API_URL=${fixtureCoreUrl}/api ` +
        `PROXY_API_URL=${fixtureProxyUrl}/v1/proxy ` +
        "PROXY_API_KEY=fixture-key AUTH_COOKIE_SECURE=false " +
        "HOST=127.0.0.1 PORT=4173 " +
        "node .output/server/index.mjs",
      url: appUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "smoke-desktop",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke-mobile",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "known-regressions",
      testMatch: /known-regressions\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "accessibility-responsive",
      testMatch: /accessibility-responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "performance",
      testMatch: /performance\.spec\.ts/,
      timeout: 120_000,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
