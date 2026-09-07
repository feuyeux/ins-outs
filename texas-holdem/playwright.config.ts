import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  fullyParallel: false,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: process.env.TEST_URL ? undefined : {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: process.env.TEST_URL ?? "http://localhost:5174",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
