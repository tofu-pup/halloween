import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:4187/halloween/",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1194, height: 834 } } },
    { name: "webkit", grep: /Safari audio session/, use: { ...devices["Desktop Safari"], viewport: { width: 1194, height: 834 } } },
  ],
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4187/halloween/",
    env: { PORT: "4187" },
    reuseExistingServer: !process.env.CI,
  },
});
