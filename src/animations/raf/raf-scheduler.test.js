import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("raf schduler cache unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/animations/raf/raf-scheduler.html");
});
