import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../playwright-jasmine.js";

test("native capability catalog tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/runtime/native-capabilities.html");
});
