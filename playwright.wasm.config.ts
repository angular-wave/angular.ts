import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT || "4000";
const baseURL = process.env.PW_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: "./src/services/wasm",
  testMatch: ["wasm.test.ts", "wasm-worker-concept.test.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "make serve",
    url: baseURL,
    reuseExistingServer: true,
  },
});
