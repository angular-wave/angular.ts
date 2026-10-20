import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultBudgets = resolve(scriptDirectory, "../config/performance-budgets.json");

export function loadPerformanceBudgets(path = defaultBudgets) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (
    manifest.schemaVersion !== 1 ||
    !Number.isInteger(manifest.repeatIterations) ||
    manifest.repeatIterations < 1 ||
    !Array.isArray(manifest.budgets) ||
    manifest.budgets.length === 0
  ) {
    throw new Error("HarmonyOS performance budget manifest is invalid");
  }
  return manifest;
}

function metricValue(report, path) {
  return path.split(".").reduce((value, member) => value?.[member], report.metrics);
}

export function validatePerformanceReport(report, manifest = loadPerformanceBudgets()) {
  if (
    report?.schemaVersion !== 1 ||
    !Number.isInteger(report.repeatIterations) ||
    report.repeatIterations < manifest.repeatIterations ||
    typeof report.metrics !== "object" ||
    report.metrics === null
  ) {
    throw new Error("HarmonyOS performance report is incomplete");
  }
  return manifest.budgets.map((budget) => {
    const value = metricValue(report, budget.metric);
    if (!Number.isFinite(value)) {
      throw new Error(`HarmonyOS performance report is missing ${budget.metric}`);
    }
    if (value > budget.maximum) {
      throw new Error(
        `${budget.metric} was ${value} ${budget.unit}; ` +
          `budget is ${budget.maximum} ${budget.unit}`,
      );
    }
    return { ...budget, value };
  });
}
