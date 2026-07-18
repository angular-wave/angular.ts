import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/services/service-worker/service-worker.html?random=false";
const INTEGRATION_URL =
  "src/services/service-worker/service-worker-integration.html?random=false";
const DOCS_EXAMPLE_URL =
  "docs/static/examples/service-worker/service-worker.html?random=false";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("registers a real service worker and exchanges messages", async ({
  page,
}) => {
  await page.goto(INTEGRATION_URL);
  const supported = await page.evaluate(() => {
    const target = window as unknown as {
      serviceWorkerIntegration: { supported(): boolean };
    };

    return target.serviceWorkerIntegration.supported();
  });

  test.skip(!supported, "Service workers are unavailable in this browser.");

  await page.evaluate(async () => {
    const target = window as unknown as {
      serviceWorkerIntegration: { cleanup(): Promise<boolean> };
    };

    await target.serviceWorkerIntegration.cleanup();
  });
  await page.goto(`${INTEGRATION_URL}&case=message`);

  const result = await page.evaluate(async () => {
    const target = window as unknown as {
      serviceWorkerIntegration: {
        cleanup(): Promise<boolean>;
        registerAndExchange(testId: string): Promise<{
          controller: boolean;
          message: {
            kind: string;
            payload: { ok: boolean };
            testId: string;
            version: string;
          };
          status: string;
        }>;
      };
    };
    const testId = `message-${String(Date.now())}`;

    try {
      return await target.serviceWorkerIntegration.registerAndExchange(testId);
    } finally {
      await target.serviceWorkerIntegration.cleanup();
    }
  });

  expect(result.controller).toBe(true);
  expect(result.status).toBe("ready");
  expect(result.message).toEqual({
    kind: "pong",
    payload: { ok: true },
    testId: expect.stringMatching(/^message-/),
    version: "message",
  });
});

test("detects an updated real service worker script", async ({ page }) => {
  await page.goto(INTEGRATION_URL);
  const supported = await page.evaluate(() => {
    const target = window as unknown as {
      serviceWorkerIntegration: { supported(): boolean };
    };

    return target.serviceWorkerIntegration.supported();
  });

  test.skip(!supported, "Service workers are unavailable in this browser.");

  await page.evaluate(async () => {
    const target = window as unknown as {
      serviceWorkerIntegration: { cleanup(): Promise<boolean> };
    };

    await target.serviceWorkerIntegration.cleanup();
  });
  await page.goto(`${INTEGRATION_URL}&case=update`);

  const result = await page.evaluate(async () => {
    const target = window as unknown as {
      serviceWorkerIntegration: {
        cleanup(): Promise<boolean>;
        detectUpdate(testId: string): Promise<{
          observed: Array<{
            phase?: ServiceWorkerState;
            scriptUrl: string;
            waiting: boolean;
          }>;
          update: {
            phase?: ServiceWorkerState;
            scriptUrl: string;
            waiting: boolean;
          };
        }>;
      };
    };
    const testId = `update-${String(Date.now())}`;

    try {
      return await target.serviceWorkerIntegration.detectUpdate(testId);
    } finally {
      await target.serviceWorkerIntegration.cleanup();
    }
  });

  expect(result.observed.length).toBeGreaterThan(0);
  expect(result.update.scriptUrl).toContain("version=two");
  expect(result.update.phase).toBeTruthy();
});

test("docs service worker example registers, messages, and prompts updates", async ({
  page,
}) => {
  await page.goto(DOCS_EXAMPLE_URL);
  const supported = await page.evaluate(() => "serviceWorker" in navigator);

  test.skip(!supported, "Service workers are unavailable in this browser.");

  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registrations
        .filter((registration) =>
          registration.scope.includes("/docs/static/examples/service-worker/"),
        )
        .map((registration) => registration.unregister()),
    );
  });
  await page.goto(`${DOCS_EXAMPLE_URL}&case=docs`);

  try {
    await page.getByTestId("register").click();
    await expect(page.getByTestId("status")).toHaveText("ready");

    await page.getByTestId("message-worker").click();
    await expect(page.getByTestId("message")).toHaveText("Worker 1 replied.");

    await page.getByTestId("stage-update").click();
    await expect(page.getByTestId("update")).toHaveText(
      "Update is waiting. Activation is your choice.",
    );

    await page.getByTestId("activate-update").click();
    await expect(page.getByTestId("status")).toHaveText(
      "Controller changed. Reload remains explicit.",
    );
  } finally {
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations
          .filter((registration) =>
            registration.scope.includes(
              "/docs/static/examples/service-worker/",
            ),
          )
          .map((registration) => registration.unregister()),
      );
    });
  }
});
