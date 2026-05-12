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

test("native bridge demo loads backend view and handles native replies", async ({
  page,
}) => {
  await page.goto("src/services/native/native-demo.html");

  await expect(
    page.getByRole("heading", { name: "Native bridge view" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("Shared AngularTS native bridge")).toBeVisible();

  await page.getByRole("button", { name: "Native DOM patch" }).click();
  await expect(page.locator("#native-feed")).toContainText("Native patch");

  await page.getByText("Open Compose drawer").click();
  await page.getByRole("button", { name: "Refresh from server" }).click();
  await expect(page.locator("#native-drawer-card")).toContainText(
    "Compose drawer selected a server action",
  );
});

test("native bridge demo serves Turbo Native style backend screens from Go", async ({
  page,
}) => {
  await page.goto("src/services/native/native-demo.html");

  await page
    .getByRole("button", { name: "Navigate to another webpage" })
    .click();
  await expect(
    page.getByRole("heading", { name: "How did you get here?" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Replace with another webpage" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Push or replace?" }),
  ).toBeVisible();
  await expect(page.getByText("replace action")).toBeVisible();

  await page.getByRole("button", { name: "Back to demo menu" }).click();
  await page.getByRole("button", { name: "Follow a redirect" }).click();
  await expect(
    page.getByRole("heading", { name: "Redirected page" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Back to demo menu" }).click();
  await page
    .getByRole("button", { name: "Intercept unauthorized access" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unauthorized" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByPlaceholder("Type your name").fill("Ada");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Native bridge view" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Intercept unauthorized access" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Protected page" }),
  ).toBeVisible();
});

test("native bridge demo uses browser-native view transitions for backend views", async ({
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

  await page
    .getByRole("button", { name: "Navigate to another webpage" })
    .click();
  await expect(
    page.getByRole("heading", { name: "How did you get here?" }),
  ).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => window.__nativeViewTransitionCount))
    .toBeGreaterThan(0);
});

test("native bridge demo exercises backend transport channels", async ({
  page,
}) => {
  await page.goto("src/services/native/native-demo.html");

  await expect(
    page.getByRole("heading", { name: "Backend data channels" }),
  ).toBeVisible();

  const restPanel = page
    .locator(".native-transports > .demo-grid > .demo-panel")
    .filter({ has: page.getByRole("heading", { name: "REST" }) });

  await restPanel.getByRole("button", { name: "Load tasks" }).click();
  await expect(restPanel).toContainText("Loaded 3 tasks");
  await expect(restPanel).toContainText("Write API notes");

  await restPanel.getByRole("button", { name: "Create task" }).click();
  await expect(restPanel).toContainText("Created task");
  await expect(restPanel).toContainText("Native bridge review");

  const ssePanel = page
    .locator(".native-transports > .demo-grid > .demo-panel")
    .filter({ has: page.getByRole("heading", { name: "SSE" }) });

  await ssePanel.getByRole("button", { name: "Start SSE stream" }).click();
  await expect(page.locator("#sse-feed")).toContainText("Update");

  const websocketPanel = page
    .locator(".native-transports > .demo-grid > .demo-panel")
    .filter({ has: page.getByRole("heading", { name: "WebSocket" }) });

  await websocketPanel.getByRole("button", { name: "Connect" }).click();
  await expect(websocketPanel).toContainText("WebSocket connected");
  await websocketPanel.getByRole("button", { name: "Send" }).click();
  await expect(websocketPanel).toContainText("Echo");

  const hasWebTransport = await page.evaluate(() => "WebTransport" in window);

  const metadata = await page.request.get("/webtransport/cert-hash");

  test.skip(
    !hasWebTransport || !metadata.ok(),
    "WebTransport test backend is unavailable",
  );

  const webTransportPanel = page
    .locator(".native-transports > .demo-grid > .demo-panel")
    .filter({ has: page.getByRole("heading", { name: "WebTransport" }) });

  await webTransportPanel
    .getByRole("button", { name: "Send datagram" })
    .click();
  await expect(webTransportPanel).toContainText("Hello WebTransport");
});
