import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/router/params/param-type.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});
