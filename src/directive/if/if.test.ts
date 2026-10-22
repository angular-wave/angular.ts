import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/directive/if/if.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test.describe("animations", () => {
  test("animates ng-if without legacy lifecycle classes", async ({ page }) => {
    await page.goto("src/directive/if/if-animate-css.html");
    await page.content();

    await page.click('button:has-text("Fade In!")');
    let animated = await page.locator("#data-animate");

    await expect(animated).toBeVisible();
    await expect(animated).not.toHaveClass(/ng-enter|ng-leave/);

    await page.click('button:has-text("Fade Out!")');
    await page.waitForTimeout(250);
    await expect(animated).not.toBeVisible();

    await page.click('button:has-text("Fade In!")');
    animated = await page.locator("#animate");

    await expect(animated).toBeVisible();
    await expect(animated).not.toHaveClass(/ng-enter|ng-leave/);

    await page.click('button:has-text("Fade Out!")');
    await page.waitForTimeout(250);
    await expect(animated).not.toBeVisible();

    await page.click('button:has-text("Fade In!")');
    const nonAnimated = await page.locator("#no-animate");

    await expect(nonAnimated).toBeVisible();
    await expect(nonAnimated).not.toHaveClass(/ng-enter|ng-leave/);

    await page.click('button:has-text("Fade Out!")');
    await expect(nonAnimated).not.toBeVisible();
  });

  test("cancels a previous leave animation when ng-if re-enters", async ({
    page,
  }) => {
    await page.goto("src/directive/if/if-animate-css.html");
    await page.content();

    await page.click('button:has-text("Fade In!")');
    const animated = await page.locator("#data-animate");

    await expect(animated).toBeVisible();
    await expect(animated).not.toHaveClass(/ng-enter|ng-leave/);

    await page.click('button:has-text("Fade Out!")');
    await page.click('button:has-text("Fade In!")');
    await page.waitForTimeout(250);

    await expect(animated).toBeVisible();
    await expect(animated).not.toHaveClass(/ng-enter|ng-leave/);
  });

  test("preserves SVG elements when their container is transcluded", async ({
    page,
  }) => {
    await page.goto("src/directive/if/if-animate-svg.html");
    const circle = page.locator("svg circle#circle");

    await expect(circle).toHaveCount(0);
    await page.getByRole("button", { name: "Fade In!" }).click();
    await expect(circle).toHaveCount(1);
    expect(await circle.evaluate((node) => node.namespaceURI)).toBe(
      "http://www.w3.org/2000/svg",
    );
    await expect(page.locator("svg-container")).toHaveCount(0);

    await page.getByRole("button", { name: "Fade Out!" }).click();
    await expect(circle).toHaveCount(0);
    await page.getByRole("button", { name: "Fade In!" }).click();
    await expect(circle).toHaveCount(1);
    expect(await circle.evaluate((node) => node.namespaceURI)).toBe(
      "http://www.w3.org/2000/svg",
    );
  });
});
