import { expect, test } from "@playwright/test";

test("Rust todo demo runs through the AngularTS bridge", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const bootstrapRequests: string[] = [];
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
    if (
      url.includes(
        "/integrations/rust/examples/basic_app/.angular-ts/bootstrap.js",
      )
    ) {
      bootstrapRequests.push(url);
    }
    if (
      url.includes(
        "/integrations/rust/examples/basic_app/pkg/angular_ts_rust_basic_app_bg.wasm",
      )
    ) {
      wasmRequests.push(url);
    }
  });

  await page.goto("/integrations/rust/examples/basic_app/");

  expect(bootstrapRequests.length).toBeGreaterThan(0);
  expect(wasmRequests.length).toBeGreaterThan(0);

  const rows = page.locator("todo-list .todo-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Learn AngularTS");
  await expect(rows.nth(1)).toContainText("Build an AngularTS app");

  await page.getByLabel("Todo title").fill("Review Rust bridge");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText("Review Rust bridge");

  await rows.nth(1).getByRole("checkbox").check();
  await expect(rows.nth(1).getByRole("checkbox")).toBeChecked();
  await expect(rows.nth(1)).toHaveClass(/done/);

  await page.getByRole("button", { name: "Archive" }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator("todo-list")).not.toContainText(
    "Build an AngularTS app",
  );

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
