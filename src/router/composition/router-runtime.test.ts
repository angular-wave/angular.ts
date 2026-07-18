import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/router/composition/router-runtime.html?random=false";

test("router runtime composition tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});
