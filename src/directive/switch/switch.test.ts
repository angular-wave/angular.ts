import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/directive/switch/switch.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("native animation removes stale leaving switch cases", async ({
  page,
}) => {
  await page.goto("src/directive/switch/switch-animate-test.html");

  const select = page.locator("select");

  await select.selectOption({ label: "home" });
  await page.waitForTimeout(20);
  await select.selectOption({ label: "other" });
  await page.waitForTimeout(20);
  await select.selectOption({ label: "options" });
  await page.waitForTimeout(250);

  await expect(page.locator(".animate-switch")).toHaveCount(1);
  await expect(page.locator(".animate-switch")).toHaveText("Settings Div");
});
