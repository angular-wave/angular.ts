import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("raf-scheduler unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/animations/runner/animate-runner.html?random=false",
  );
});
