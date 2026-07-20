import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { expectWasmAbiConformance } from "../../abi-conformance.ts";

const dotnetRuntime = resolve(
  import.meta.dirname,
  "../examples/todo/_framework/dotnet.js",
);

test("C# Wasm todo demo updates AngularTS scope through WasmScope", async ({
  page,
}) => {
  test.skip(
    !existsSync(dotnetRuntime),
    "C# browser runtime output is not built yet; install dotnet browser-wasm workload and build examples/todo.",
  );

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const dotnetRequests: string[] = [];

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
    if (url.includes("/integrations/wasm/csharp/examples/todo/_framework/")) {
      dotnetRequests.push(url);
    }
  });

  await page.goto("/integrations/wasm/csharp/examples/todo/");

  expect(dotnetRequests.length).toBeGreaterThan(0);
  await expectWasmAbiConformance(page);

  const rows = page.locator(".todo-row");
  const input = page.getByLabel("C# todo title");

  await expect(rows).toHaveCount(2);
  await expect(page.locator("#csharp-remaining")).toContainText("2 of 2");
  await expect(rows.first()).toContainText("Learn AngularTS");
  await expect(rows.nth(1)).toContainText("Build a C# Wasm app");

  await input.fill("Review C# bridge");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText("Review C# bridge");
  await expect(page.locator("#csharp-remaining")).toContainText("3 of 3");
  await expect(input).toHaveValue("");

  await rows.first().getByRole("checkbox").check();
  await expect(rows.first().getByRole("checkbox")).toBeChecked();
  await expect(rows.first()).toHaveClass(/done/);
  await expect(page.locator("#csharp-remaining")).toContainText("2 of 3");

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Build a C# Wasm app");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as typeof window & {
          __angularTsCsharpWasmStats?: () => { created: number; freed: number };
        };
        const stats = testWindow.__angularTsCsharpWasmStats?.();

        return stats ? stats.created === stats.freed && stats.created > 0 : false;
      }),
    )
    .toBe(true);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
