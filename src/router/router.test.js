import { test, expect } from "@playwright/test";
import { expectNoJasmineFailures } from "../../playwright-jasmine.js";

const TEST_URL = "src/router/router.html?random=false";
const ROUTER_HARNESS_URL = "/src/router/router-test.html";
const ROUTER_HASHBANG_HARNESS_URL = "/src/router/router-test-hashbang.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("router html5 harness populates ng-view on initial load", async ({
  page,
}) => {
  await page.goto(ROUTER_HARNESS_URL);
  await expect(page).toHaveURL(/\/src\/router\/router-test\.html$/);
  await expect(page.locator("ng-view")).toContainText("Home");
  await expect(page.locator("ng-view a[ng-sref='page1']")).toContainText(
    "Page 1",
  );
});

test("router html5 harness navigates into page1", async ({ page }) => {
  await page.goto(ROUTER_HARNESS_URL);
  await page.locator("ng-view a[ng-sref='page1']").click();
  await expect(page).toHaveURL(/\/page1$/);
  await expect(page.locator("ng-view")).toContainText(
    "Its the NG-Router hello world app!",
  );
  await expect(page.locator("ng-view")).not.toContainText("Home");
});

test("router hashbang harness populates ng-view on initial load", async ({
  page,
}) => {
  await page.goto(ROUTER_HASHBANG_HARNESS_URL);
  await expect(page).toHaveURL(/router-test-hashbang\.html(?:#.*)?$/);
  await expect(page.locator("ng-view")).toContainText("Home");
  await expect(page.locator("ng-view a[ng-sref='page1']")).toContainText(
    "Page 1",
  );
  await expect(page.locator("ng-view a[ng-sref='page2']")).toContainText(
    "Page 2",
  );
});

test("router hashbang harness navigates into page2", async ({ page }) => {
  await page.goto(ROUTER_HASHBANG_HARNESS_URL);
  await page.locator("ng-view a[ng-sref='page2']").click();
  await expect(page).toHaveURL(/#?\/?page2$/);
  await expect(page.locator("ng-view")).toContainText(
    "This is another template",
  );
  await expect(page.locator("ng-view")).not.toContainText("Home");
});
