import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../playwright-jasmine.js";

test("$animate unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/animations/animate.html");
});
