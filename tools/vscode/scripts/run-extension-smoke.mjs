import { runTests } from "@vscode/test-electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionDevelopmentPath = path.resolve(__dirname, "..");
const extensionTestsPath = path.join(
  extensionDevelopmentPath,
  "out",
  "smoke",
  "extensionHostSmoke.js",
);
const fixturePath = path.join(
  extensionDevelopmentPath,
  "test-fixtures",
  "route-completions",
);

await runTests({
  extensionDevelopmentPath,
  extensionTestsPath,
  launchArgs: [
    fixturePath,
    "--disable-extensions",
    "--disable-workspace-trust",
  ],
});
