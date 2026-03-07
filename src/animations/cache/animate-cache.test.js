import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("animate cache unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/animations/cache/animate-cache.html",
  );
});
