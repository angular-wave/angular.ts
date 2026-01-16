import { test, expect } from "@playwright/test";

test("animate css unit tests contain no errors", async ({ page }) => {
  await page.goto("src/animations/css/animate-css.html");
  await page.content();

  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    / 0 failures/,
  );
});
