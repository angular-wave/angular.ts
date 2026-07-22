import { expect, test } from "@playwright/test";
import {
  expectNoJasmineFailures,
  runJasminePage,
} from "../playwright-jasmine.js";

const fixtureUrl = "/src/playwright-jasmine-bridge.html";

test("Playwright bridge captures Jasmine 6 failures", async ({ page }) => {
  const diagnostics = await runJasminePage(page, `${fixtureUrl}?mode=failure`);

  expect(diagnostics.overallStatus).toBe("failed");
  expect(diagnostics.failedSpecs).toHaveLength(1);
  expect(diagnostics.failedSpecs[0].fullName).toBe(
    "Playwright Jasmine bridge captures failed expectations",
  );
  expect(diagnostics.failedSpecs[0].failedExpectations[0]).toContain(
    "Expected 1 to be 2",
  );
});

test("Playwright bridge preserves focused-run policy", async ({ page }) => {
  await expectNoJasmineFailures(page, fixtureUrl);

  await expect(
    expectNoJasmineFailures(page, fixtureUrl, { allowFocusedSpecs: false }),
  ).rejects.toThrow(/Overall status: incomplete/);
});
