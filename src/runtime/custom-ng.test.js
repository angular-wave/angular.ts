import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../playwright-jasmine.js";

const TEST_URL = "src/runtime/custom-ng.html";

test("custom runtime unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});
