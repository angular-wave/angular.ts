import { Angular } from "../../src/angular.ts";
import type {
  CloneAttachFn,
  LinkFn,
} from "../../src/core/compile/compile.ts";
import type { Scope } from "../../src/core/scope/scope.ts";
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

type CompileService = (template: string | Node | NodeList) => LinkFn;

type RuntimeServices = {
  $compile: CompileService;
  $rootScope: Scope;
  destroy(): void;
};

type BenchmarkScope = Scope & Record<string, unknown>;

declare global {
  interface Window {
    __linkBenchmarkResults?: BenchmarkResult;
    __linkBenchmarkError?: string;
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

function createRuntimeServices(): RuntimeServices {
  const angular = new Angular();
  const root = document.getElementById("benchmark-root")!;

  root.innerHTML = "";
  window.angular = angular;

  const injector = angular.bootstrap(root, ["ng"]);

  return {
    $compile: injector.get("$compile") as CompileService,
    $rootScope: injector.get("$rootScope") as Scope,
    destroy() {
      angular._composition.destroy();
      root.replaceChildren();
      delete (window as unknown as { angular?: unknown }).angular;
    },
  };
}

async function measure(
  name: string,
  template: string,
  iterations: number,
  samples: number,
  action: () => unknown,
): Promise<BenchmarkSummary> {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    sink = action();
  }

  await Promise.resolve();

  const sampleTimes: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    const startedAt = performance.now();

    for (let i = 0; i < iterations; i++) {
      sink = action();
    }

    sampleTimes.push(performance.now() - startedAt);
    await Promise.resolve();
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

function linkWithNewScope(
  linkFn: LinkFn,
  $rootScope: Scope,
  createScopeData?: () => Record<string, unknown>,
): unknown {
  const scope = $rootScope.$new() as BenchmarkScope;

  if (createScopeData) {
    Object.assign(scope, createScopeData());
  }

  try {
    const linkedNodes = linkFn(scope, captureClone);

    return linkedNodes;
  } finally {
    scope.$destroy();
  }
}

const captureClone: CloneAttachFn = (clone) => {
  sink = clone;
};

export async function runLinkBenchmark(
  options: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;

  const samples = options.samples ?? DEFAULT_SAMPLES;

  const runtime = createRuntimeServices();

  try {
    const results: BenchmarkSummary[] = [];

    for (const benchmark of compileLinkBenchmarkCases.filter(
      (candidate) => candidate.includeInLink !== false,
    )) {
      const linkFn = runtime.$compile(benchmark.template);

      results.push(
        await measure(
          benchmark.name,
          benchmark.template,
          iterations,
          samples,
          () =>
            linkWithNewScope(
              linkFn,
              runtime.$rootScope,
              benchmark.createScopeData,
            ),
        ),
      );
    }

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

  window.__linkBenchmarkResults = await runLinkBenchmark(options);
  document.getElementById("status")!.textContent = "Link benchmark complete.";
} catch (error) {
  window.__linkBenchmarkError =
    error instanceof Error ? error.stack || error.message : String(error);
  document.getElementById("status")!.textContent = window.__linkBenchmarkError;
  throw error;
} finally {
  document.body.dataset.sink = String(Boolean(sink));
}
