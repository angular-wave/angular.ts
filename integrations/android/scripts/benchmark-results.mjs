import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const androidRoot = resolve(scriptDirectory, "..");
const defaultResults = join(
  androidRoot,
  "benchmark/build/outputs/connected_android_test_additional_output",
);
const defaultBudgets = join(androidRoot, "config/benchmark-budgets.json");

export function loadBudgets(path = defaultBudgets) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (
    manifest.schemaVersion !== 1 ||
    !Number.isInteger(manifest.repeatIterations) ||
    manifest.repeatIterations < 1 ||
    !Array.isArray(manifest.budgets) ||
    manifest.budgets.length === 0
  ) {
    throw new Error("Android benchmark budget manifest is invalid.");
  }
  return manifest;
}

function metricValue(benchmark, path) {
  return path.split(".").reduce((value, member) => value?.[member], benchmark);
}

function emulatorContext(context) {
  const build = context?.build ?? {};
  const identity = [build.brand, build.device, build.fingerprint, build.model]
    .join(" ")
    .toLowerCase();
  return /(emulator|generic|goldfish|ranchu|sdk_gphone|emu64)/u.test(identity);
}

export function validateBenchmarkData(data, manifest, enforceBudgets) {
  if (!Array.isArray(data?.benchmarks)) {
    throw new Error("AndroidX benchmark data does not contain benchmarks.");
  }
  if (enforceBudgets && emulatorContext(data.context)) {
    throw new Error("Physical benchmark budgets reject emulator results.");
  }

  const measured = new Map(data.benchmarks.map((entry) => [entry.name, entry]));
  return manifest.budgets.map((budget) => {
    const benchmark = measured.get(budget.benchmark);
    if (!benchmark) {
      throw new Error(`Missing Android benchmark ${budget.benchmark}.`);
    }
    if (benchmark.repeatIterations < manifest.repeatIterations) {
      throw new Error(
        `${budget.benchmark} ran ${benchmark.repeatIterations} iterations; ` +
          `${manifest.repeatIterations} are required.`,
      );
    }
    const value = metricValue(benchmark, budget.metric);
    if (!Number.isFinite(value)) {
      throw new Error(
        `${budget.benchmark} is missing numeric metric ${budget.metric}.`,
      );
    }
    if (enforceBudgets && value > budget.maximum) {
      throw new Error(
        `${budget.benchmark} ${budget.metric} was ${value} ${budget.unit}; ` +
          `budget is ${budget.maximum} ${budget.unit}.`,
      );
    }
    return { ...budget, value };
  });
}

function benchmarkDataFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.name.endsWith("benchmarkData.json")) files.push(child);
    }
  };
  visit(directory);
  return files;
}

function main() {
  const mode = process.argv[2];
  if (mode !== "--smoke" && mode !== "--physical") {
    throw new Error(
      "Usage: benchmark-results.mjs --smoke|--physical [results directory]",
    );
  }
  const directory = resolve(process.argv[3] ?? defaultResults);
  const files = benchmarkDataFiles(directory);
  if (files.length !== 1) {
    throw new Error(
      `Expected one AndroidX benchmark data file in ${directory}, found ${files.length}.`,
    );
  }
  const file = files[0];
  const data = JSON.parse(readFileSync(file, "utf8"));
  const results = validateBenchmarkData(
    data,
    loadBudgets(),
    mode === "--physical",
  );
  const kind = mode === "--physical" ? "physical budgets" : "smoke metrics";
  console.log(`Android benchmark ${kind} passed from ${file}.`);
  for (const result of results) {
    console.log(
      `- ${result.benchmark} ${result.metric}: ${result.value} ${result.unit}`,
    );
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
