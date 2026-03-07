import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("unit href tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/directive/ref/href.html");
});

test("unit ref tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/directive/ref/ref.html");
});
