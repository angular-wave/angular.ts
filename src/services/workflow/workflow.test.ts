import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("workflow unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/services/workflow/workflow.html");
});
