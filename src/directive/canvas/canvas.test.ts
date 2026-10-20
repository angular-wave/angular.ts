import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("canvas lifecycle unit tests", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/directive/canvas/canvas.html?random=false",
  );
});

test("chart redraws from a reactive model and resizes its backing store", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("docs/static/examples/canvas/chart.html");
  const canvas = page.locator("canvas");
  await expect(page.getByTestId("chart-value")).toHaveText("60");
  await expect(canvas).toHaveAttribute("width", "480");
  const pixel = () =>
    canvas.evaluate((element: HTMLCanvasElement) => [
      ...element.getContext("2d")!.getImageData(200, 80, 1, 1).data,
    ]);
  await expect.poll(pixel).toEqual([47, 128, 237, 255]);
  await page.getByRole("slider", { name: "Value" }).fill("10");
  await expect(page.getByTestId("chart-value")).toHaveText("10");
  await expect.poll(pixel).toEqual([232, 238, 244, 255]);
  await page.setViewportSize({ width: 360, height: 600 });
  await expect(canvas).toHaveAttribute("width", "312");
  expect(errors).toEqual([]);
});

test("the second canvas example redraws position and color changes", async ({
  page,
}) => {
  await page.goto("concepts/canvas/");
  const canvas = page.locator("canvas");
  const pixel = () =>
    canvas.evaluate((element: HTMLCanvasElement) => [
      ...element.getContext("2d")!.getImageData(120, 100, 1, 1).data,
    ]);
  await expect.poll(pixel).toEqual([47, 128, 237, 255]);
  await page.getByRole("slider", { name: "X", exact: true }).fill("240");
  await expect.poll(pixel).toEqual([0, 0, 0, 0]);
});
