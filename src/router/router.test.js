import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../playwright-jasmine.js";

const TEST_URL = "src/router/router.html?random=false";
const SMOKE_URL = "src/router/router-test.html";
const VIEW_TRANSITION_URL = "src/router/router-view-transition-test.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("standalone router page renders the initial state", async ({ page }) => {
  await page.goto(SMOKE_URL);

  await expect(page.locator("ng-view")).toContainText("Home");
  await expect(page.locator("ng-view")).toContainText("Page 1");
});

test("standalone router view transition demo navigates between states", async ({
  page,
}) => {
  await page.goto(VIEW_TRANSITION_URL);

  await expect(page.locator(".route-view h1")).toHaveText("Overview");

  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page.locator(".route-view h1")).toHaveText("Reports");

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.locator(".route-view h1")).toHaveText("Settings");
});
