import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

declare global {
  interface Window {
    __nativeViewTransitionCount?: number;
  }
}

test("native bridge unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/services/native/native.html");
});

test("native drawer demo loads the server route app", async ({ page }) => {
  await page.goto("src/services/native/native-demo.html");

  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Native shell, server content" }),
  ).toBeVisible();
});

test("native drawer demo routes between server fragments", async ({
  page,
}) => {
  await page.goto("src/services/native/native-demo.html");

  await page.getByText("Menu").click();
  await page.getByRole("button", { name: "Projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Three backend fragments" }),
  ).toBeVisible();

  await page.getByText("Menu").click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Native app boundaries" }),
  ).toBeVisible();

  await page.getByText("Menu").click();
  await page.getByRole("button", { name: "Native Card" }).click();
  await expect(page.getByRole("heading", { name: "Native Card" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Elevated Jetpack Compose card" }),
  ).toBeVisible();
  await expect(page.locator(".native-card-fallback")).toContainText(
    "Random native picture",
  );

  await page.getByText("Menu").click();
  await page.getByRole("button", { name: "Today" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("native drawer demo uses browser view transitions for server routes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const transitionDocument = document as unknown as {
      startViewTransition?: (callback: () => void) => unknown;
    };
    const original = transitionDocument.startViewTransition?.bind(document);

    window.__nativeViewTransitionCount = 0;
    transitionDocument.startViewTransition = (callback: () => void) => {
      window.__nativeViewTransitionCount =
        (window.__nativeViewTransitionCount || 0) + 1;

      if (original) return original(callback);

      callback();

      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {
          // Test shim for browsers without the API.
        },
      };
    };
  });

  await page.goto("src/services/native/native-demo.html");

  await page.evaluate(() => {
    window.__nativeViewTransitionCount = 0;
  });

  await page.getByText("Menu").click();
  await page.getByRole("button", { name: "Projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => window.__nativeViewTransitionCount))
    .toBeGreaterThan(0);
});
