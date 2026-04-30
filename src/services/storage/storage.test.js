import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("storage unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/services/storage/storage.html");
});
