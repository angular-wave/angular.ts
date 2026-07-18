import { expect, test } from "@playwright/test";

test("shares one compiled WebAssembly module with a managed worker", async ({
  page,
}) => {
  await page.goto("/concepts/wasm-worker/");

  await expect(page.getByTestId("status")).toHaveText("ready");
  await expect(page.getByTestId("module-shared")).toHaveText("true");
  await expect(page.getByTestId("memory-shared")).toHaveText("true");
  await expect(page.getByTestId("shared-value")).toHaveText("2");
  await expect(page.getByTestId("main-result")).toHaveText("1");

  await page.getByRole("button", { name: "Increment in worker guest" }).click();

  await expect(page.getByTestId("worker-result")).toHaveText("3");
  await expect(page.getByTestId("shared-value")).toHaveText("3");
  await expect(page.getByTestId("status")).toHaveText("ready");
});
