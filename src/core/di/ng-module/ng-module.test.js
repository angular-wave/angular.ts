import { test, expect } from "@playwright/test";

const TEST_URL = "src/core/di/ng-module/ng-module.html";

test("unit tests contain no errors", async ({ page }) => {
  await page.goto(TEST_URL);
  await page.content();
  await page.waitForTimeout(5000);
  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    / 0 failures/,
  );
});
