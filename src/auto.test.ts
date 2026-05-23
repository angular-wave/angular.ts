import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../playwright-jasmine.js";

test("auto entrypoint bootstraps ng-app documents", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/auto.html?random=false");
});
