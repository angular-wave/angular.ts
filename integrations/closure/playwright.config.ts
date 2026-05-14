import baseConfig from "../../playwright.config.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "../..");

export default {
  ...baseConfig,
  testDir: ".",
  testMatch: [
    "closure.test.ts",
    "clojurescript/clojurescript.test.ts",
    "java/j2cl.test.ts",
  ],
  webServer: {
    ...baseConfig.webServer,
    command: `make -C ${repoRoot} serve`,
  },
};
