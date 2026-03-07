import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../../playwright-jasmine.js";

const TEST_URL = "src/core/di/ng-module/ng-module.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});
