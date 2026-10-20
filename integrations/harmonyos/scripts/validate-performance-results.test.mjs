import assert from "node:assert/strict";
import test from "node:test";
import {
  loadPerformanceBudgets,
  validatePerformanceReport,
} from "./validate-performance-results.mjs";
import { performanceReportFixture } from "./performance-results.fixture.mjs";

test("accepts complete HarmonyOS measurements within every budget", () => {
  const budgets = loadPerformanceBudgets();
  assert.equal(
    validatePerformanceReport(performanceReportFixture(), budgets).length,
    budgets.budgets.length,
  );
});

test("rejects incomplete, short, and over-budget measurements", () => {
  const incomplete = performanceReportFixture();
  delete incomplete.metrics.navigationMs;
  assert.throws(() => validatePerformanceReport(incomplete), /missing navigationMs\.p95/u);

  const short = performanceReportFixture();
  short.repeatIterations = 4;
  assert.throws(() => validatePerformanceReport(short), /report is incomplete/u);

  const regression = performanceReportFixture();
  regression.metrics.bridgeRoundTripMs.p95 = 101;
  assert.throws(() => validatePerformanceReport(regression), /budget is 100 ms/u);

  const unsupported = performanceReportFixture();
  unsupported.schemaVersion = 2;
  assert.throws(() => validatePerformanceReport(unsupported), /report is incomplete/u);
});
