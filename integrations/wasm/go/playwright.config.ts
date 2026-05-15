import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT || "4000";
const baseURL = process.env.PW_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.test.ts"],
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "make -C ../../.. serve",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
