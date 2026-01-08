import { test, expect } from "@playwright/test";

test("raf schduler cache unit tests contain no errors", async ({ page }) => {
  await page.goto("src/animations/raf/raf-scheduler.html");
  await page.content();

  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    / 0 failures/,
  );
});
