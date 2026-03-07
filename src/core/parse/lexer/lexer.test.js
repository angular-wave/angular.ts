import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../../playwright-jasmine.js";

test("lexer unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/core/parse/lexer/lexer.html");
});
