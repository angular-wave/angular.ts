import { expect, test } from "@playwright/test";

test("Go Wasm todo demo updates AngularTS scope through WasmScope", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const wasmRequests: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/integrations/wasm/go/examples/basic_app/main.wasm")) {
      wasmRequests.push(url);
    }
  });

  await page.goto("/integrations/wasm/go/examples/basic_app/");

  expect(wasmRequests.length).toBeGreaterThan(0);

  const rows = page.locator(".todo-row");
  const input = page.getByLabel("Go todo title");

  await expect(rows).toHaveCount(2);
  await expect(page.locator("#go-remaining")).toContainText("2 of 2");
  await expect(rows.first()).toContainText("Learn AngularTS");
  await expect(rows.nth(1)).toContainText("Build a Go Wasm app");

  await input.fill("Review Go bridge");
  await expect(page.locator("#go-title-seen")).toHaveText(
    "New title seen by Go: Review Go bridge",
  );

  await page.getByRole("button", { name: "Add" }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText("Review Go bridge");
  await expect(page.locator("#go-remaining")).toContainText("3 of 3");
  await expect(input).toHaveValue("");

  await rows.first().getByRole("checkbox").check();
  await expect(rows.first().getByRole("checkbox")).toBeChecked();
  await expect(rows.first()).toHaveClass(/done/);
  await expect(page.locator("#go-remaining")).toContainText("2 of 3");

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Build a Go Wasm app");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
