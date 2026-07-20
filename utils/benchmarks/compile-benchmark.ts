import { Angular } from "../../src/angular.ts";
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

type CompileRuntime = {
  $compile: CompileService;
  destroy(): void;
};

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

function createCompileRuntime(): CompileRuntime {
  const angular = new Angular();
  const root = document.getElementById("benchmark-root")!;

  root.innerHTML = "";
  window.angular = angular;

  const injector = angular.bootstrap(root, ["ng"]);

  return {
    $compile: injector.get("$compile") as CompileService,
    destroy() {
      angular._composition.destroy();
      root.replaceChildren();
      delete (window as unknown as { angular?: unknown }).angular;
    },
  };
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

  const runtime = createCompileRuntime();

  try {
    const results = compileLinkBenchmarkCases.map((benchmark) =>
      measure(benchmark.name, benchmark.template, iterations, samples, () =>
        runtime.$compile(benchmark.template),
      ),
    );

    return {
      userAgent: navigator.userAgent,
      iterations,
      samples,
      results,
    };
  } finally {
    runtime.destroy();
  }
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
