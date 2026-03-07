import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("unit observer tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/directive/observe/observe.html");
});
