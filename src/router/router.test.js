import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../playwright-jasmine.js";

const TEST_URL = "src/router/router.html?random=false";
const SMOKE_URL = "src/router/router-test.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("standalone router page renders the initial state", async ({ page }) => {
  await page.goto(SMOKE_URL);

  await expect(page.locator("ng-view")).toContainText("Home");
  await expect(page.locator("ng-view")).toContainText("Page 1");
});
