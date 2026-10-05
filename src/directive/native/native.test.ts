import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("native bridge unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/directive/native/native.html");
});

test("native calls work after document adoption in the regression order", async ({
  page,
}) => {
  await expectNoJasmineFailures(
    page,
    "src/directive/native/native.html?random=true&seed=21488",
  );
});
