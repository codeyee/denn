import { defineConfig, devices } from "@playwright/test";

const fixtureCorePort = process.env.E2E_FIXTURE_CORE_PORT ?? "18000";
const fixtureProxyPort = process.env.E2E_FIXTURE_PROXY_PORT ?? "18080";
const appPort = process.env.E2E_APP_PORT ?? "4173";
const fixtureCoreUrl = `http://127.0.0.1:${fixtureCorePort}`;
const fixtureProxyUrl = `http://127.0.0.1:${fixtureProxyPort}`;
const appUrl = `http://127.0.0.1:${appPort}`;
const fixtureBuildSha = "f".repeat(40);

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
      command:
        `E2E_FIXTURE_CORE_PORT=${fixtureCorePort} ` +
        `E2E_FIXTURE_PROXY_PORT=${fixtureProxyPort} ` +
        `E2E_APP_PORT=${appPort} ` +
        "node e2e/fixtures/server.mjs",
      url: `${fixtureCoreUrl}/__fixture__/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command:
        `API_URL=${fixtureCoreUrl}/api ` +
        `PROXY_API_URL=${fixtureProxyUrl}/v1/proxy ` +
        "PROXY_API_KEY=fixture-key AUTH_COOKIE_SECURE=false " +
        `BUILD_SHA=${fixtureBuildSha} ` +
        `HOST=127.0.0.1 PORT=${appPort} ` +
        "node .output/server/index.mjs",
      url: appUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "smoke-desktop",
      testMatch: /(smoke|public-catalog|browse)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke-mobile",
      testMatch: /(smoke|public-catalog|browse)\.spec\.ts/,
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
      name: "visual-mobile",
      testMatch: /visual-regression\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      },
    },
    {
      name: "visual-desktop",
      testMatch: /visual-regression\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      },
    },
    {
      name: "performance",
      testMatch: /performance\.spec\.ts/,
      timeout: 180_000,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
