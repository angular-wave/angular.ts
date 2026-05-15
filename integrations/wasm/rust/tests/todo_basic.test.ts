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
        "/integrations/wasm/rust/examples/basic_app/.angular-ts/bootstrap.js",
      )
    ) {
      bootstrapRequests.push(url);
    }
    if (
      url.includes(
        "/integrations/wasm/rust/examples/basic_app/pkg/angular_ts_rust_basic_app_bg.wasm",
      )
    ) {
      wasmRequests.push(url);
    }
  });

  const reset = await page.request.post("/api/tasks/reset");
  expect(reset.ok()).toBe(true);

  await page.goto("/integrations/wasm/rust/examples/basic_app/");

  expect(bootstrapRequests.length).toBeGreaterThan(0);
  expect(wasmRequests.length).toBeGreaterThan(0);

  const rows = page.locator("todo-list .todo-row");
  const serverRows = page.locator("todo-list .server-task-row");
  const controllerTitle = page.locator("#rust-controller-title");
  const remaining = page.locator("#rust-remaining");
  const input = page.getByLabel("Todo title");

  await expect(controllerTitle).toHaveText("Rust-authored AngularTS Todos");
  await expect(rows).toHaveCount(2);
  await expect(remaining).toContainText("2 of 2");
  await expect(rows.first()).toContainText("Learn AngularTS");
  await expect(rows.nth(1)).toContainText("Build an AngularTS app");
  await expect(page.locator("#server-status")).toHaveText("Not loaded");
  await expect(page.locator("#server-task-count")).toHaveText(
    "Server task count: 0",
  );
  await expect(page.locator("#server-task-empty")).toHaveText(
    "No server tasks loaded",
  );
  await expect(serverRows).toHaveCount(0);

  await page.getByRole("button", { name: "Load server tasks" }).click();
  await expect(page.locator("#server-status")).toHaveText(
    "Loaded 3 tasks with HTTP 200",
  );
  await expect(page.locator("#server-task-count")).toHaveText(
    "Server task count: 3",
  );
  await expect(serverRows).toHaveCount(3);
  await expect(serverRows.nth(0)).toHaveText(
    "#1 Write API notes by Ada (Open)",
  );
  await expect(serverRows.nth(1)).toHaveText(
    "#2 Review cache policy by Lin (Open)",
  );
  await expect(serverRows.nth(2)).toHaveText(
    "#3 Ship REST demo by Grace (Done)",
  );
  await expect(page.locator("#server-task-empty")).toHaveCount(0);

  await input.fill("Review Rust bridge");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(rows).toHaveCount(3);
  await expect(remaining).toContainText("3 of 3");
  await expect(rows.nth(2)).toContainText("Review Rust bridge");
  await expect(input).toHaveValue("");

  await input.fill("   ");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(rows).toHaveCount(3);
  await expect(remaining).toContainText("3 of 3");

  await rows.first().getByRole("checkbox").check();
  await expect(rows.first().getByRole("checkbox")).toBeChecked();
  await expect(rows.first()).toHaveClass(/done/);
  await expect(remaining).toContainText("2 of 3");

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Build an AngularTS app");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
