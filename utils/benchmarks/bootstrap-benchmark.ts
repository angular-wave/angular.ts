import { Angular } from "../../src/angular.ts";
import {
  createAngular,
  type AngularRuntime,
} from "../../src/runtime/index.ts";
import { eventBusModule } from "../../src/runtime/event-bus.ts";
import { htmlCanvasModule } from "../../src/runtime/html-canvas.ts";
import { orchestrationModule } from "../../src/runtime/orchestration.ts";
import { realtimeModule } from "../../src/runtime/realtime.ts";
import { routerModule } from "../../src/runtime/router.ts";
import { serviceWorkerModule } from "../../src/runtime/service-worker.ts";
import { wasmModule } from "../../src/runtime/wasm.ts";
import { webComponentModule } from "../../src/runtime/web-component.ts";
import type { RuntimeModule } from "../../src/angular-runtime.ts";

type BootstrapKind =
  | "core"
  | "event-bus"
  | "router"
  | "orchestration"
  | "realtime"
  | "wasm"
  | "service-worker"
  | "web-component"
  | "html-canvas"
  | "full";

interface BootstrapRecord {
  root: HTMLElement;
  runtime: AngularRuntime;
}

interface BenchmarkSummary {
  kind: "bootstrap";
  name: string;
  iterations: number;
  samples: number;
  minMs: number;
  medianMs: number;
  meanMs: number;
  opsPerSecond: number;
}

interface HeapSummary {
  kind: "heap";
  name: string;
  instances: number;
  retainedBytes: number;
  bytesPerRuntime: number;
  releasedBytes: number;
}

interface BootstrapBenchmarkResult {
  userAgent: string;
  iterations: number;
  samples: number;
  heapInstances: number;
  results: BenchmarkSummary[];
  heap: HeapSummary[];
}

interface BootstrapBenchmarkOptions {
  iterations?: number;
  samples?: number;
  heapInstances?: number;
}

interface MemoryPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
  };
}

declare global {
  interface Window {
    __bootstrapBenchmarkResults?: BootstrapBenchmarkResult;
    __bootstrapBenchmarkError?: string;
    gc?: () => void;
  }
}

const DEFAULT_ITERATIONS = 100;
const DEFAULT_SAMPLES = 7;
const DEFAULT_HEAP_INSTANCES = 25;
const WARMUP_ITERATIONS = 10;
const runtimeHost = window as unknown as { angular?: unknown };
const customRegistrars: Partial<
  Record<BootstrapKind, readonly RuntimeModule[]>
> = {
  core: [],
  "event-bus": [eventBusModule],
  router: [routerModule],
  orchestration: [orchestrationModule],
  realtime: [realtimeModule],
  wasm: [wasmModule],
  "service-worker": [serviceWorkerModule],
  "web-component": [webComponentModule],
  "html-canvas": [htmlCanvasModule],
};
const benchmarkKinds = Object.keys(customRegistrars) as BootstrapKind[];

benchmarkKinds.push("full");

function readOptions(): Required<BootstrapBenchmarkOptions> {
  const params = new URLSearchParams(window.location.search);

  return {
    iterations: positiveInteger(params.get("iterations"), DEFAULT_ITERATIONS),
    samples: positiveInteger(params.get("samples"), DEFAULT_SAMPLES),
    heapInstances: positiveInteger(
      params.get("heapInstances"),
      DEFAULT_HEAP_INSTANCES,
    ),
  };
}

function positiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createRuntime(kind: BootstrapKind): BootstrapRecord {
  const runtime =
    kind === "full"
      ? new Angular()
      : createAngular({ modules: customRegistrars[kind] });
  const root = document.createElement("main");

  runtime.bootstrap(root, []);

  return { root, runtime };
}

function destroyRuntime(record: BootstrapRecord): void {
  record.runtime._composition.destroy();
  record.root.remove();
  delete runtimeHost.angular;
}

function measureBootstrap(
  kind: BootstrapKind,
  iterations: number,
  samples: number,
): BenchmarkSummary {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    destroyRuntime(createRuntime(kind));
  }

  const sampleTimes: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    let elapsed = 0;

    for (let iteration = 0; iteration < iterations; iteration++) {
      const startedAt = performance.now();
      const record = createRuntime(kind);

      elapsed += performance.now() - startedAt;
      destroyRuntime(record);
    }

    sampleTimes.push(elapsed);
  }

  sampleTimes.sort((left, right) => left - right);

  const meanMs =
    sampleTimes.reduce((total, value) => total + value, 0) / sampleTimes.length;

  return {
    kind: "bootstrap",
    name: `${kind} runtime bootstrap`,
    iterations,
    samples,
    minMs: sampleTimes[0],
    medianMs: sampleTimes[Math.floor(sampleTimes.length / 2)],
    meanMs,
    opsPerSecond: iterations / (meanMs / 1000),
  };
}

function readHeapSize(): number {
  window.gc?.();

  const memory = (performance as MemoryPerformance).memory;

  if (!memory) {
    throw new Error(
      "Chromium performance.memory is unavailable; retained-heap benchmarking requires precise memory information.",
    );
  }

  return memory.usedJSHeapSize;
}

function measureHeap(kind: BootstrapKind, instances: number): HeapSummary {
  const before = readHeapSize();
  const records = Array.from({ length: instances }, () => createRuntime(kind));
  const retained = readHeapSize();

  records.forEach(destroyRuntime);

  const afterDestroy = readHeapSize();
  const retainedBytes = Math.max(0, retained - before);

  return {
    kind: "heap",
    name: `${kind} runtime retained heap`,
    instances,
    retainedBytes,
    bytesPerRuntime: retainedBytes / instances,
    releasedBytes: Math.max(0, retained - afterDestroy),
  };
}

export function runBootstrapBenchmark(
  options: BootstrapBenchmarkOptions = {},
): BootstrapBenchmarkResult {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const samples = options.samples ?? DEFAULT_SAMPLES;
  const heapInstances = options.heapInstances ?? DEFAULT_HEAP_INSTANCES;

  return {
    userAgent: navigator.userAgent,
    iterations,
    samples,
    heapInstances,
    results: benchmarkKinds.map((kind) =>
      measureBootstrap(kind, iterations, samples),
    ),
    heap: benchmarkKinds.map((kind) => measureHeap(kind, heapInstances)),
  };
}

try {
  const options = readOptions();

  window.__bootstrapBenchmarkResults = runBootstrapBenchmark(options);
  document.getElementById("status")!.textContent =
    "Bootstrap benchmark complete.";
} catch (error) {
  window.__bootstrapBenchmarkError =
    error instanceof Error ? error.stack || error.message : String(error);
  document.getElementById("status")!.textContent =
    window.__bootstrapBenchmarkError;
  throw error;
}
