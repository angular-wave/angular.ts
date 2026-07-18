import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL =
  "src/core/app-context/app-context-service-reactivity.html?random=false";

test("app context service reactivity tests contain no errors", async ({
  page,
}) => {
  await expectNoJasmineFailures(page, TEST_URL);
});
