import { expect, test } from "@playwright/test";
import { expectWasmAbiConformance } from "../../abi-conformance.ts";

test("Zig Wasm todo demo updates AngularTS scope through WasmScope", async ({
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
    if (url.includes("/integrations/wasm/zig/examples/todo/main.wasm")) {
      wasmRequests.push(url);
    }
  });

  await page.goto("/integrations/wasm/zig/examples/todo/");

  expect(wasmRequests.length).toBeGreaterThan(0);
  await expectWasmAbiConformance(page);

  const rows = page.locator(".todo-row");
  const input = page.getByLabel("Zig todo title");

  await expect(rows).toHaveCount(2);
  await expect(page.locator("#zig-remaining")).toContainText("2 of 2");
  await expect(rows.first()).toContainText("Learn AngularTS");
  await expect(rows.nth(1)).toContainText("Build a Zig Wasm app");

  await input.fill("Review Zig bridge");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText("Review Zig bridge");
  await expect(page.locator("#zig-remaining")).toContainText("3 of 3");
  await expect(input).toHaveValue("");

  await rows.first().getByRole("checkbox").check();
  await expect(rows.first().getByRole("checkbox")).toBeChecked();
  await expect(rows.first()).toHaveClass(/done/);
  await expect(page.locator("#zig-remaining")).toContainText("2 of 3");

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Build a Zig Wasm app");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
