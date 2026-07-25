import { defineConfig, devices } from "@playwright/test";

const appUrl = process.env.LOCAL_WEB_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e-local",
  outputDir: "test-results/local-artifacts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["line"]],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "local-public",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
