import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("animate css unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/animations/css/animate-css.html");
});
