import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/services/machine/machine.html");
});
