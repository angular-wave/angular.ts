import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("unit view-directives tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/router/directives/view-directives.html?random=false",
  );
});
