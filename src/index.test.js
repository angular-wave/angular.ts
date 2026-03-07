import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../playwright-jasmine.js";

test("src tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/index.html?random=false");
});
