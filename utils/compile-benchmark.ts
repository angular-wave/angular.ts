import { Angular } from "../src/angular.ts";
import { createInjector } from "../src/core/di/injector.ts";
import type { Scope } from "../src/core/scope/scope.ts";
import { compileLinkBenchmarkCases } from "./compile-link-benchmark-cases.ts";

type BenchmarkSummary = {
  name: string;
  template: string;
  iterations: number;
  samples: number;
  minMs: number;
  medianMs: number;
  meanMs: number;
  opsPerSecond: number;
};

type BenchmarkResult = {
  userAgent: string;
  iterations: number;
  samples: number;
  results: BenchmarkSummary[];
};

type BenchmarkOptions = {
  iterations?: number;
  samples?: number;
};

type CompileService = (template: string | Node | NodeList) => Function;

declare global {
  interface Window {
    __compileBenchmarkResults?: BenchmarkResult;
    __compileBenchmarkError?: string;
  }
}

const DEFAULT_ITERATIONS = 5_000;
const DEFAULT_SAMPLES = 7;
const WARMUP_ITERATIONS = 500;

let sink: unknown;

function readOptions(): Required<BenchmarkOptions> {
  const params = new URLSearchParams(window.location.search);

  return {
    iterations: positiveInteger(params.get("iterations"), DEFAULT_ITERATIONS),
    samples: positiveInteger(params.get("samples"), DEFAULT_SAMPLES),
  };
}

function positiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createCompileService(): CompileService {
  window.angular = new Angular();

  const injector = createInjector(["ng"]);

  return injector.get("$compile") as CompileService;
}

function measure(
  name: string,
  template: string,
  iterations: number,
  samples: number,
  action: () => unknown,
): BenchmarkSummary {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    sink = action();
  }

  const sampleTimes: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    const startedAt = performance.now();

    for (let i = 0; i < iterations; i++) {
      sink = action();
    }

    sampleTimes.push(performance.now() - startedAt);
  }

  sampleTimes.sort((left, right) => left - right);

  const sum = sampleTimes.reduce((total, value) => total + value, 0);

  const meanMs = sum / sampleTimes.length;

  return {
    name,
    template,
    iterations,
    samples,
    minMs: sampleTimes[0],
    medianMs: sampleTimes[Math.floor(sampleTimes.length / 2)],
    meanMs,
    opsPerSecond: iterations / (meanMs / 1000),
  };
}

export async function runCompileBenchmark(
  options: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;

  const samples = options.samples ?? DEFAULT_SAMPLES;

  const $compile = createCompileService();

  const results = compileLinkBenchmarkCases.map((benchmark) =>
    measure(benchmark.name, benchmark.template, iterations, samples, () =>
      $compile(benchmark.template),
    ),
  );

  return {
    userAgent: navigator.userAgent,
    iterations,
    samples,
    results,
  };
}

try {
  const options = readOptions();

  window.__compileBenchmarkResults = await runCompileBenchmark(options);
  document.getElementById("status")!.textContent =
    "Compile benchmark complete.";
} catch (error) {
  window.__compileBenchmarkError =
    error instanceof Error ? error.stack || error.message : String(error);
  document.getElementById("status")!.textContent =
    window.__compileBenchmarkError;
  throw error;
} finally {
  document.body.dataset.sink = String(Boolean(sink));
}
