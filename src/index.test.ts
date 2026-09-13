import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../playwright-jasmine.js";

test("src tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/index.html?random=false");
});

test("default package entry auto-bootstraps ng-app", async ({ page }) => {
  await page.goto("/src/index-autobootstrap.html");

  await expect(page.getByTestId("result")).toHaveText("2");
  expect(await page.evaluate(() => "init" in window.angular)).toBe(false);
});
