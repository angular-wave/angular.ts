import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("native bridge unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/directive/native/native.html");
});
