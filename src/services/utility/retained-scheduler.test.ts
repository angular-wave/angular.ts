import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("retained scheduler unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/services/utility/retained-scheduler.html",
  );
});
