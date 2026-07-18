import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/services/html-canvas/html-canvas.html?random=false";
const DOCS_EXAMPLE_URL =
  "docs/static/examples/html-canvas/html-canvas.html?random=false";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("docs example boots with native-only auto config", async ({ page }) => {
  await page.goto(DOCS_EXAMPLE_URL);
  await expect(page.getByTestId("ship-name")).toHaveText("The Canvas Voyager");
  await expect(page.getByTestId("html-canvas-status")).toContainText(
    "HTML-in-Canvas native runtime",
  );
});

test("docs example keeps enterprise interaction policy in application code", async ({
  page,
}) => {
  await page.goto(DOCS_EXAMPLE_URL);

  await expect(page.getByTestId("policy-mode")).toHaveText("explicit-approval");
  await page
    .getByTestId("approve-action")
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId("policy-status")).toHaveText(
    "Interaction blocked by application policy.",
  );

  await page
    .getByTestId("approval-code")
    .evaluate((input: HTMLInputElement) => {
      input.value = "LAUNCH";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await page
    .getByTestId("approve-action")
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId("policy-status")).toHaveText(
    "Interaction accepted by application policy.",
  );
});
