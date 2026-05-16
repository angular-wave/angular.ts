import { expect, test, type Page } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/directive/form/form.html";
const DEMO_URL = "src/directive/form/form-demo.html";

const INPUT_TYPES = [
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "email",
  "file",
  "hidden",
  "image",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "reset",
  "search",
  "submit",
  "tel",
  "text",
  "time",
  "url",
  "week",
  "datetime",
];

async function expectModelValue(page: Page, model: string, expected: unknown) {
  await expect
    .poll(async () => {
      const text = await page.getByTestId("model-values").textContent();
      const fields = JSON.parse(text ?? "[]") as Array<{
        model: string;
        value?: unknown;
      }>;

      return fields.find((field) => field.model === model)?.value;
    })
    .toEqual(expected);
}

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("form demo renders every MDN input type and live controller state", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(DEMO_URL);

  await expect(
    page.getByRole("heading", { name: "Form input state demo" }),
  ).toBeVisible();

  for (const type of INPUT_TYPES) {
    await expect(page.locator(`input[type="${type}"]`)).toHaveCount(
      type === "radio" ? 3 : 1,
    );
  }

  await expect(page.getByTestId("inline-control-state")).toHaveCount(
    INPUT_TYPES.length,
  );
  await expectModelValue(page, "text", "plain text");
  await expectModelValue(page, "datetime", "2026-05-16T12:30Z");
  await expect(page.getByTestId("form-valid")).toHaveText("true");
  await expect(page.getByTestId("form-submitted")).toHaveText("false");
  const emailState = page.locator(
    '[data-testid="inline-control-state"][data-control-state-for="emailInput"]',
  );

  await expect(emailState).toContainText("$validity.typeMismatch: false");

  await page.locator("#emailInput").fill("not an email");
  await expect(page.getByTestId("form-valid")).toHaveText("false");
  await expect(page.getByTestId("form-invalid")).toHaveText("true");
  await expect(emailState).toContainText("$invalid: true");

  await page.locator("#emailInput").fill("valid@example.com");
  await page.locator("#submitInput").click();

  await expect(page.getByTestId("form-valid")).toHaveText("true");
  await expect(page.getByTestId("form-submitted")).toHaveText("true");
  await expect(page.getByTestId("submit-count")).toHaveText("1");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
