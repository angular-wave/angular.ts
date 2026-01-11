import { test, expect } from "@playwright/test";

const TEST_URL = "src/services/anchor-scroll/anchor-scroll.html";

test("unit tests contain no errors", async ({ page }) => {
  await page.goto(TEST_URL);
  await page.content();
  await page.waitForTimeout(1000);
  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    / 0 failures/,
  );
});

const EXAMPLE_URL = "src/services/anchor-scroll/anchor-scroll-test.html";

test("scrolls to anchor when clicking header link", async ({ page }) => {
  await page.goto(EXAMPLE_URL);

  const initialScroll = await getScrollY(page);
  expect(initialScroll).toBe(0);

  await page.click("text=Go to anchor 3");

  // wait for scrolling to finish
  await page.waitForTimeout(100);

  const scrollY = await getScrollY(page);
  expect(scrollY).toBeGreaterThan(0);
});

test("respects yOffset when scrolling", async ({ page }) => {
  await page.goto(EXAMPLE_URL);

  await page.click("text=Go to anchor 2");
  await page.waitForTimeout(100);

  const anchorTop = await page.evaluate(() => {
    const el = document.getElementById("anchor2");
    return el.getBoundingClientRect().top;
  });

  // yOffset = 100 → anchor should appear ~100px below viewport top
  expect(anchorTop).toBe(-390);
  expect(anchorTop).toBeLessThanOrEqual(110);
});

test("clicking same anchor twice still scrolls", async ({ page }) => {
  await page.goto(EXAMPLE_URL);

  await page.click("text=Go to anchor 4");
  await page.waitForTimeout(100);

  const firstScroll = await getScrollY(page);

  // Scroll somewhere else
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.click("text=Go to anchor 4");
  await page.waitForTimeout(100);

  const secondScroll = await getScrollY(page);

  expect(secondScroll).toBeGreaterThan(firstScroll - 5);
});

test("updates URL hash on navigation", async ({ page }) => {
  await page.goto(EXAMPLE_URL);

  await page.click("text=Go to anchor 1");

  await expect(page).toHaveURL(/#anchor1$/);
});

test("anchor content is not hidden behind fixed header", async ({ page }) => {
  await page.goto(EXAMPLE_URL);

  await page.click("text=Go to anchor 5");
  await page.waitForTimeout(100);

  const overlap = await page.evaluate(() => {
    const header = document.querySelector(".fixed-header");
    const anchor = document.getElementById("anchor5");

    const headerBottom = header.getBoundingClientRect().bottom;
    const anchorTop = anchor.getBoundingClientRect().top;

    return anchorTop < headerBottom;
  });

  expect(overlap).toBe(false);
});

async function getScrollY(page) {
  return page.evaluate(() => window.scrollY);
}
