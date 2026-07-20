import { Angular } from "../../src/angular.ts";

type BenchmarkSummary = {
  kind: "router";
  name: string;
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

type StateService = {
  go(name: string, params?: Record<string, unknown>): Promise<unknown>;
  href(name: string, params?: Record<string, unknown>): string;
};

type RouterServices = {
  $state: StateService;
  destroy(): void;
};

type DisposableWorkload = {
  destroy(): void;
};

declare global {
  interface Window {
    __routerBenchmarkResults?: BenchmarkResult;
    __routerBenchmarkError?: string;
  }
}

const DEFAULT_ITERATIONS = 1_000;
const DEFAULT_SAMPLES = 7;
const ROUTE_COUNT = 100;
const RETAINED_ROUTE_COUNT = 5;
const WARMUP_ITERATIONS = 100;

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

function createRouterServices(moduleName: string): RouterServices {
  const runtime = new Angular();

  window.angular = runtime;

  const app = window.angular.module(moduleName, ["ng"]);
  app.component("benchView", {
    bindings: { id: "<" },
    template: "<p>{{$ctrl.id}}</p>",
  });
  const children: Array<Record<string, unknown>> = Array.from(
    { length: ROUTE_COUNT },
    (_, index) => ({
      name: `detail${index}`,
      url: `/detail-${index}/{id:int}`,
      component: "benchView",
      resolve: {
        id: function () {
          return index;
        },
      },
    }),
  );
  children.push({
    name: "retained",
    url: "/retained",
    template: "<ng-view></ng-view>",
    policy: {
      retention: {
        mode: "keep-alive",
        max: RETAINED_ROUTE_COUNT,
        pause: "schedulers",
      },
    },
    children: Array.from({ length: RETAINED_ROUTE_COUNT }, (_, index) => ({
      name: `tab${index}`,
      url: `/tab-${index}`,
      component: "benchView",
      resolve: {
        id: function () {
          return index;
        },
      },
    })),
  });
  app.router({
    name: "bench",
    url: "/bench",
    component: "benchView",
    children,
  });

  const root = document.createElement("main");
  root.innerHTML = "<ng-view></ng-view>";
  const injector = window.angular.bootstrap(root, [moduleName]);

  return {
    $state: injector.get("$state") as StateService,
    destroy() {
      runtime._composition.destroy();
      root.remove();
      delete (window as unknown as { angular?: unknown }).angular;
    },
  };
}

function createFirstNavigationWorkload(index: number): RouterServices {
  const moduleName = `routerFirstNavigationBenchmark${index}`;
  const runtime = new Angular();

  window.angular = runtime;

  const app = runtime.module(moduleName, ["ng"]);

  app.component("firstView", {
    bindings: { id: "<" },
    template: "<p>{{$ctrl.id}}</p>",
  });
  app.router({
    name: "bench",
    url: "/bench",
    children: [
      {
        name: "navigation",
        url: "/navigation/{id:int}",
      },
      {
        name: "view",
        url: "/view/{id:int}",
        component: "firstView",
        resolve: {
          id: () => index,
        },
      },
    ],
  });

  const root = document.createElement("main");

  root.innerHTML = "<ng-view></ng-view>";
  document.body.append(root);

  const injector = runtime.bootstrap(root, [moduleName]);

  return {
    $state: injector.get("$state") as StateService,
    destroy() {
      runtime._composition.destroy();
      root.remove();
      delete (window as unknown as { angular?: unknown }).angular;
    },
  };
}

function createRegistrationWorkload(index: number): DisposableWorkload {
  const runtime = new Angular();

  window.angular = runtime;
  const moduleName = `routerRegistrationBenchmark${index}`;
  const app = runtime.module(moduleName, ["ng"]);
  app.router({
    name: "bench",
    url: "/bench",
    children: Array.from({ length: ROUTE_COUNT }, (_, routeIndex) => ({
      name: `detail${routeIndex}`,
      url: `/detail-${routeIndex}/{id:int}`,
      template: `<p>${routeIndex}</p>`,
    })),
  });
  const root = document.createElement("main");
  root.innerHTML = "<ng-view></ng-view>";
  runtime.bootstrap(root, [moduleName]);

  return {
    destroy() {
      runtime._composition.destroy();
      root.remove();
      delete (window as unknown as { angular?: unknown }).angular;
    },
  };
}

function measure(
  name: string,
  iterations: number,
  samples: number,
  action: (iteration: number) => unknown,
): BenchmarkSummary {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) sink = action(i);

  const sampleTimes: number[] = [];
  for (let sample = 0; sample < samples; sample++) {
    const startedAt = performance.now();

    for (let i = 0; i < iterations; i++) sink = action(i);

    sampleTimes.push(performance.now() - startedAt);
  }

  return summarize(name, iterations, samples, sampleTimes);
}

function measureManaged<T extends DisposableWorkload>(
  name: string,
  iterations: number,
  samples: number,
  action: (iteration: number) => T,
): BenchmarkSummary {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    const workload = action(i);

    workload.destroy();
  }

  const sampleTimes: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    let elapsed = 0;

    for (let i = 0; i < iterations; i++) {
      const startedAt = performance.now();
      const workload = action(i);

      elapsed += performance.now() - startedAt;
      workload.destroy();
    }

    sampleTimes.push(elapsed);
  }

  return summarize(name, iterations, samples, sampleTimes);
}

async function measureAsync(
  name: string,
  iterations: number,
  samples: number,
  action: (iteration: number) => Promise<unknown>,
): Promise<BenchmarkSummary> {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) sink = await action(i);

  const sampleTimes: number[] = [];
  for (let sample = 0; sample < samples; sample++) {
    const startedAt = performance.now();

    for (let i = 0; i < iterations; i++) sink = await action(i);

    sampleTimes.push(performance.now() - startedAt);
  }

  return summarize(name, iterations, samples, sampleTimes);
}

async function measureColdNavigation(
  name: string,
  routeName: "bench.navigation" | "bench.view",
  iterations: number,
  samples: number,
): Promise<BenchmarkSummary> {
  const warmupIterations = Math.min(10, WARMUP_ITERATIONS);

  for (let i = 0; i < warmupIterations; i++) {
    const services = createFirstNavigationWorkload(i);

    sink = await services.$state.go(routeName, { id: i });
    services.destroy();
  }

  const sampleTimes: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    let elapsed = 0;

    for (let i = 0; i < iterations; i++) {
      const services = createFirstNavigationWorkload(
        warmupIterations + sample * iterations + i,
      );
      const startedAt = performance.now();

      sink = await services.$state.go(routeName, { id: i });
      elapsed += performance.now() - startedAt;
      services.destroy();
    }

    sampleTimes.push(elapsed);
  }

  return summarize(name, iterations, samples, sampleTimes);
}

function summarize(
  name: string,
  iterations: number,
  samples: number,
  sampleTimes: number[],
): BenchmarkSummary {
  sampleTimes.sort((left, right) => left - right);

  const sum = sampleTimes.reduce((total, value) => total + value, 0);
  const meanMs = sum / sampleTimes.length;

  return {
    kind: "router",
    name,
    iterations,
    samples,
    minMs: sampleTimes[0],
    medianMs: sampleTimes[Math.floor(sampleTimes.length / 2)],
    meanMs,
    opsPerSecond: iterations / (meanMs / 1000),
  };
}

export async function runRouterBenchmark(
  options: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const samples = options.samples ?? DEFAULT_SAMPLES;
  const services = createRouterServices("routerBenchmark");

  const coldIterations = Math.max(1, Math.floor(iterations / 20));

  const results = [
    await measureColdNavigation(
      "first router navigation",
      "bench.navigation",
      coldIterations,
      samples,
    ),
    await measureColdNavigation(
      "first view activation",
      "bench.view",
      coldIterations,
      samples,
    ),
    measureManaged(
      "register 100-route tree",
      Math.max(1, Math.floor(iterations / 20)),
      samples,
      (index) => createRegistrationWorkload(index),
    ),
    measure("href generation", iterations, samples, (index) =>
      services.$state.href(`bench.detail${index % ROUTE_COUNT}`, { id: index }),
    ),
    await measureAsync(
      "transition startup",
      Math.max(1, Math.floor(iterations / 10)),
      samples,
      async (index) => {
        const result = await services.$state.go(
          `bench.detail${index % ROUTE_COUNT}`,
          {
            id: index,
          },
        );
        return result;
      },
    ),
    await measureAsync(
      "retained route cycle",
      Math.max(1, Math.floor(iterations / 20)),
      samples,
      async (index) => {
        await services.$state.go(
          `bench.retained.tab${index % RETAINED_ROUTE_COUNT}`,
        );
        const result = await services.$state.go(
          `bench.detail${index % ROUTE_COUNT}`,
          {
            id: index,
          },
        );
        return result;
      },
    ),
  ];

  services.destroy();

  return {
    userAgent: navigator.userAgent,
    iterations,
    samples,
    results,
  };
}

try {
  const options = readOptions();

  window.__routerBenchmarkResults = await runRouterBenchmark(options);
  document.getElementById("status")!.textContent = "Router benchmark complete.";
} catch (error) {
  window.__routerBenchmarkError =
    error instanceof Error ? error.stack || error.message : String(error);
  document.getElementById("status")!.textContent =
    window.__routerBenchmarkError;
  throw error;
} finally {
  document.body.dataset.sink = String(Boolean(sink));
}
