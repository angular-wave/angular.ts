import { expect, test } from "@playwright/test";

test("Rust scope bridge propagates browser scope updates into Wasm", async ({
  page,
}) => {
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
        "/integrations/wasm/rust/examples/scope_bridge/.angular-ts/bootstrap.js",
      )
    ) {
      bootstrapRequests.push(url);
    }
    if (
      url.includes(
        "/integrations/wasm/rust/examples/scope_bridge/pkg/angular_ts_rust_scope_bridge_bg.wasm",
      )
    ) {
      wasmRequests.push(url);
    }
  });

  await page.goto("/integrations/wasm/rust/examples/scope_bridge/");

  expect(bootstrapRequests.length).toBeGreaterThan(0);
  expect(wasmRequests.length).toBeGreaterThan(0);

  await expect(page.locator("#scope-count")).toHaveText("Count: 0");
  await expect(page.locator("#scope-seen")).toHaveText("Seen by Rust: 0");
  await expect(page.locator("#scope-source")).toHaveText("Source: constructed");

  await page.getByRole("button", { name: "Increment from Rust" }).click();
  await expect(page.locator("#scope-count")).toHaveText("Count: 1");
  await expect(page.locator("#scope-seen")).toHaveText("Seen by Rust: 1");
  await expect(page.locator("#scope-source")).toHaveText("Source: rust");

  await page.locator("#browser-count").fill("7");
  await expect(page.locator("#scope-count")).toHaveText("Count: 7");
  await expect(page.locator("#scope-seen")).toHaveText("Seen by Rust: 7");
  await expect(page.locator("#scope-source")).toHaveText("Source: browser");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
