import { expect, test } from "@playwright/test";

test("built root and Wasm subpath preserve reactive model identity", async ({
  page,
}) => {
  await page.goto("/src/services/wasm/wasm-package.html");
  await page.waitForFunction(
    () => "__wasmPackageResult" in window || "__wasmPackageError" in window,
  );

  const state = await page.evaluate(() => ({
    error: (window as typeof window & { __wasmPackageError?: string })
      .__wasmPackageError,
    result: (
      window as typeof window & {
        __wasmPackageResult?: { count: number; reactiveWrite: boolean };
      }
    ).__wasmPackageResult,
  }));

  expect(state.error).toBeUndefined();
  expect(state.result).toEqual({ count: 7, reactiveWrite: true });
});
