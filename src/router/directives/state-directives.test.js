import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("unit state-directives tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/router/directives/state-directives.html?random=false",
  );
});
