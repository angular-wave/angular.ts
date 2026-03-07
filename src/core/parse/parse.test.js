import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("parser unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/core/parse/parse.html");
});
