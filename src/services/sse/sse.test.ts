import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/services/sse/sse.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL, {
    timeout: 10_000,
  });
});
