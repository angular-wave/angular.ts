import { expect, test } from "@playwright/test";

test("custom runtime counter demo increments and decrements", async ({
  page,
}) => {
  await page.goto("src/runtime/custom-counter.html");

  await expect(page.getByTestId("count")).toHaveText("0");

  await page.getByTestId("increase").click();
  await expect(page.getByTestId("count")).toHaveText("1");

  await page.getByTestId("decrease").click();
  await expect(page.getByTestId("count")).toHaveText("0");
});

test("custom element counter demo increments and decrements", async ({
  page,
}) => {
  await page.goto("src/runtime/custom-element-counter.html");

  const counter = page.locator("runtime-counter");

  await expect(counter.getByTestId("count")).toHaveText("0");

  await counter.getByTestId("increase").click();
  await expect(counter.getByTestId("count")).toHaveText("1");

  await counter.getByTestId("decrease").click();
  await expect(counter.getByTestId("count")).toHaveText("0");
});
