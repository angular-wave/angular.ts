import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadBudgets, validateBenchmarkData } from "./benchmark-results.mjs";

const manifest = loadBudgets(
  fileURLToPath(new URL("../config/benchmark-budgets.json", import.meta.url)),
);

function benchmark(name) {
  return {
    name,
    repeatIterations: 5,
    metrics: {
      memoryRssAnonLastKb: { median: 32_768 },
      timeToInitialDisplayMs: { median: 700 },
    },
    sampledMetrics: { frameDurationCpuMs: { P95: 50 } },
  };
}

function data(model = "Reference Phone") {
  return {
    context: {
      build: {
        brand: "vendor",
        device: "reference",
        fingerprint: "vendor/reference/release",
        model,
      },
    },
    benchmarks: [
      benchmark("coldStartupAndFirstFrames"),
      benchmark("keyedCollectionUpdateAndScroll"),
      benchmark("webViewBridgeRoundTrips"),
    ],
  };
}

test("accepts complete physical benchmark data within every budget", () => {
  const results = validateBenchmarkData(data(), manifest, true);

  assert.equal(results.length, manifest.budgets.length);
});

test("smoke mode requires metrics without applying physical limits", () => {
  const result = data("sdk_gphone64_x86_64");
  result.benchmarks[0].metrics.timeToInitialDisplayMs.median = 10_000;

  assert.equal(
    validateBenchmarkData(result, manifest, false).length,
    manifest.budgets.length,
  );
});

test("physical mode rejects emulators and budget regressions", () => {
  assert.throws(
    () => validateBenchmarkData(data("sdk_gphone64_x86_64"), manifest, true),
    /reject emulator results/,
  );

  const regression = data();
  regression.benchmarks[1].sampledMetrics.frameDurationCpuMs.P95 = 101;
  assert.throws(
    () => validateBenchmarkData(regression, manifest, true),
    /budget is 100 ms/,
  );
});

test("rejects missing benchmarks, metrics, and iterations", () => {
  const missingBenchmark = data();
  missingBenchmark.benchmarks.pop();
  assert.throws(
    () => validateBenchmarkData(missingBenchmark, manifest, false),
    /Missing Android benchmark/,
  );

  const missingMetric = data();
  delete missingMetric.benchmarks[0].sampledMetrics.frameDurationCpuMs.P95;
  assert.throws(
    () => validateBenchmarkData(missingMetric, manifest, false),
    /missing numeric metric/,
  );

  const tooFewIterations = data();
  tooFewIterations.benchmarks[0].repeatIterations = 4;
  assert.throws(
    () => validateBenchmarkData(tooFewIterations, manifest, false),
    /5 are required/,
  );
});
