import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const port = process.env.REACTIVITY_TEST_PORT || "4191";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: ".",
  testMatch: "scope-state.test.ts",
  workers: 1,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    cwd: root,
    command: "node_modules/.bin/vite --config utils/vite.config.js",
    env: { PORT: port },
    url: baseURL,
    reuseExistingServer: false,
  },
});
