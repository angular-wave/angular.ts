import { Angular } from "../../src/angular.ts";
import { WasmAbi } from "../../src/services/wasm/wasm.ts";

interface WasmBenchmarkSummary {
  kind: "wasm";
  name: string;
  iterations: number;
  samples: number;
  minMs: number;
  medianMs: number;
  meanMs: number;
  opsPerSecond: number;
}

interface WasmBenchmarkResult {
  userAgent: string;
  iterations: number;
  samples: number;
  results: WasmBenchmarkSummary[];
}

declare global {
  interface Window {
    __wasmBenchmarkResults?: WasmBenchmarkResult;
    __wasmBenchmarkError?: string;
  }
}

const EMPTY_WASM = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
const EMPTY_WASM_DATA_URL = "data:application/wasm;base64,AGFzbQEAAAA=";
const DEFAULT_ITERATIONS = 500;
const DEFAULT_SAMPLES = 7;
const WARMUP_ITERATIONS = 20;

class GuestMemory {
  readonly memory = new WebAssembly.Memory({ initial: 4 });
  private offset = 1024;

  readonly exports = {
    memory: this.memory,
    ng_abi_version: () => WasmAbi.version,
    ng_abi_alloc: (size: number) => this.alloc(size),
    ng_abi_free: () => undefined,
    ng_scope_on_transaction: () => undefined,
  };

  alloc(size: number): number {
    const allocationSize = Math.max(size, 1);
    const requiredBytes = this.offset + allocationSize;

    if (requiredBytes > this.memory.buffer.byteLength) {
      this.memory.grow(
        Math.ceil((requiredBytes - this.memory.buffer.byteLength) / 65536),
      );
    }

    const ptr = this.offset;

    this.offset += allocationSize;

    return ptr;
  }

  write(value: string): { ptr: number; len: number } {
    const bytes = new TextEncoder().encode(value);
    const ptr = this.alloc(bytes.byteLength);

    new Uint8Array(this.memory.buffer, ptr, bytes.byteLength).set(bytes);

    return { ptr, len: bytes.byteLength };
  }
}

function positiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function measure(
  name: string,
  iterations: number,
  samples: number,
  operation: (iteration: number) => void | Promise<void>,
): Promise<WasmBenchmarkSummary> {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) await operation(i);

  const sampleTimes: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    const startedAt = performance.now();

    for (let iteration = 0; iteration < iterations; iteration++) {
      await operation(iteration);
    }

    sampleTimes.push(performance.now() - startedAt);
  }

  sampleTimes.sort((left, right) => left - right);

  const meanMs =
    sampleTimes.reduce((total, value) => total + value, 0) / sampleTimes.length;

  return {
    kind: "wasm",
    name,
    iterations,
    samples,
    minMs: sampleTimes[0],
    medianMs: sampleTimes[Math.floor(sampleTimes.length / 2)],
    meanMs,
    opsPerSecond: iterations / (meanMs / 1000),
  };
}

async function runWasmBenchmark(): Promise<WasmBenchmarkResult> {
  const params = new URLSearchParams(window.location.search);
  const iterations = positiveInteger(
    params.get("iterations"),
    DEFAULT_ITERATIONS,
  );
  const samples = positiveInteger(params.get("samples"), DEFAULT_SAMPLES);
  const angular = new Angular();
  const root = document.createElement("main");

  angular.bootstrap(root, []);

  const service = angular.$injector.get("$wasm");
  const context = angular._appContext;
  const module = await WebAssembly.compile(EMPTY_WASM);
  const sharedResponse = new Response(EMPTY_WASM, {
    headers: { "Content-Type": "application/wasm" },
  });
  const guest = new GuestMemory();
  const abi = WasmAbi.create();
  const model = context.createReactive({
    count: 0,
    frame: new Uint8Array(),
    payload: "small",
  });

  abi.attach(guest.exports);

  const scope = abi.createScope(model, { name: "benchmark:model" });
  const countPath = guest.write("count");
  const payloadPath = guest.write("payload");
  const framePath = guest.write("frame");
  const smallValue = guest.write("1");
  const largeValue = guest.write(JSON.stringify("x".repeat(64 * 1024)));
  const transaction = guest.write(
    JSON.stringify({
      set: { count: 1, payload: "transaction" },
      origin: "benchmark",
    }),
  );
  const binaryPtr = guest.alloc(64 * 1024);

  new Uint8Array(guest.memory.buffer, binaryPtr, 64 * 1024).fill(7);
  const imports = abi.imports.angular_ts;
  const results: WasmBenchmarkSummary[] = [];
  const status = document.getElementById("status")!;

  status.textContent = "Running resource load from bytes...";
  results.push(
    await measure("resource load from bytes", iterations, samples, async () => {
      const resource = service.load({ source: EMPTY_WASM });

      await resource.ready;
      resource.dispose();
    }),
  );
  status.textContent = "Running resource load from cached response...";
  results.push(
    await measure(
      "resource load from cached response",
      iterations,
      samples,
      async () => {
        const resource = service.load({ source: sharedResponse });

        await resource.ready;
        resource.dispose();
      },
    ),
  );
  status.textContent = "Running resource load from compiled module...";
  results.push(
    await measure(
      "resource load from compiled module",
      iterations,
      samples,
      async () => {
        const resource = service.load({ source: module });

        await resource.ready;
        resource.dispose();
      },
    ),
  );
  status.textContent = "Running concurrent cold compilation deduplication...";
  results.push(
    await measure(
      "concurrent cold compilation deduplication",
      iterations,
      samples,
      async () => {
        const response = new Response(EMPTY_WASM, {
          headers: { "Content-Type": "application/wasm" },
        });
        const left = service.load({ source: response });
        const right = service.load({ source: response });

        await Promise.all([left.ready, right.ready]);
        left.dispose();
        right.dispose();
      },
    ),
  );
  status.textContent = "Running diagnostics-enabled resource loading...";
  results.push(
    await measure(
      "resource load with diagnostics",
      iterations,
      samples,
      async () => {
        const resource = service.load({ source: module, diagnostics: true });

        await resource.ready;
        resource.dispose();
      },
    ),
  );
  status.textContent = "Running reactive target binding...";
  results.push(
    await measure(
      "reactive target binding",
      iterations,
      samples,
      (iteration) => {
        const target = context.createReactive({ count: iteration });
        const bound = abi.createScope(target, {
          name: `binding:${String(iteration)}`,
        });
        const dispose = bound.bind({ initial: false });

        dispose();
        bound.dispose();
        target.$destroy();
      },
    ),
  );
  status.textContent = "Running scope_get small JSON...";
  results.push(
    await measure("scope_get small JSON", iterations, samples, () => {
      const buffer = imports.scope_get(
        scope.handle,
        payloadPath.ptr,
        payloadPath.len,
      );

      imports.buffer_free(buffer);
    }),
  );

  model.payload = "x".repeat(64 * 1024);
  status.textContent = "Running scope_get 64 KiB JSON...";
  results.push(
    await measure("scope_get 64 KiB JSON", iterations, samples, () => {
      const buffer = imports.scope_get(
        scope.handle,
        payloadPath.ptr,
        payloadPath.len,
      );

      imports.buffer_free(buffer);
    }),
  );
  status.textContent = "Running scope_set small JSON...";
  results.push(
    await measure("scope_set small JSON", iterations, samples, () => {
      imports.scope_set(
        scope.handle,
        countPath.ptr,
        countPath.len,
        smallValue.ptr,
        smallValue.len,
      );
      context.modelScheduler.flush();
    }),
  );
  status.textContent = "Running scope_set 64 KiB JSON...";
  results.push(
    await measure("scope_set 64 KiB JSON", iterations, samples, () => {
      imports.scope_set(
        scope.handle,
        payloadPath.ptr,
        payloadPath.len,
        largeValue.ptr,
        largeValue.len,
      );
      context.modelScheduler.flush();
    }),
  );
  status.textContent = "Running two-field scope_apply transaction...";
  results.push(
    await measure(
      "scope_apply two-field transaction",
      iterations,
      samples,
      () => {
        imports.scope_apply(scope.handle, transaction.ptr, transaction.len);
        context.modelScheduler.flush();
      },
    ),
  );
  status.textContent = "Running scope_set_binary 64 KiB...";
  model.frame = new Uint8Array(64 * 1024);
  results.push(
    await measure("scope_set_binary 64 KiB", iterations, samples, () => {
      imports.scope_set_binary(
        scope.handle,
        framePath.ptr,
        framePath.len,
        binaryPtr,
        64 * 1024,
        0,
        0,
      );
      context.modelScheduler.flush();
    }),
  );
  status.textContent = "Running scope_get_binary 64 KiB...";
  results.push(
    await measure("scope_get_binary 64 KiB", iterations, samples, () => {
      const buffer = imports.scope_get_binary(
        scope.handle,
        framePath.ptr,
        framePath.len,
      );

      imports.buffer_free(buffer);
    }),
  );
  const megabyteValue = guest.write(JSON.stringify("x".repeat(1024 * 1024)));

  status.textContent = "Running scope_set 1 MiB JSON...";
  results.push(
    await measure("scope_set 1 MiB JSON", iterations, samples, () => {
      imports.scope_set(
        scope.handle,
        payloadPath.ptr,
        payloadPath.len,
        megabyteValue.ptr,
        megabyteValue.len,
      );
      context.modelScheduler.flush();
    }),
  );

  const stopWatching = scope.bind({ watch: ["count"], initial: false });

  status.textContent = "Running watched scope update...";
  results.push(
    await measure("watched scope update", iterations, samples, (iteration) => {
      model.count = iteration;
      context.modelScheduler.flush();
    }),
  );

  const fanoutBindings = Array.from({ length: 16 }, () =>
    scope.bind({ watch: ["count"], initial: false }),
  );

  status.textContent = "Running watched update fan-out...";
  results.push(
    await measure(
      "watched scope update to 16 callbacks",
      iterations,
      samples,
      (iteration) => {
        model.count = iteration;
        context.modelScheduler.flush();
      },
    ),
  );

  for (const dispose of fanoutBindings) dispose();

  let cacheRound = 0;
  const cacheIterations = Math.max(1, Math.floor(iterations / 100));

  status.textContent = "Running module cache eviction cycles...";
  results.push(
    await measure(
      "65-entry module cache eviction cycle",
      cacheIterations,
      samples,
      async () => {
        const resources = Array.from({ length: 65 }, (_, index) =>
          service.load({
            source: `${EMPTY_WASM_DATA_URL}#${String(cacheRound)}-${String(index)}`,
          }),
        );

        cacheRound++;
        await Promise.all(resources.map((resource) => resource.ready));
        for (const resource of resources) resource.dispose();
      },
    ),
  );

  stopWatching();
  abi.dispose();
  angular._composition.destroy();
  root.remove();

  return {
    userAgent: navigator.userAgent,
    iterations,
    samples,
    results,
  };
}

try {
  window.__wasmBenchmarkResults = await runWasmBenchmark();
  document.getElementById("status")!.textContent =
    "WebAssembly benchmark complete.";
} catch (error) {
  window.__wasmBenchmarkError =
    error instanceof Error ? error.stack || error.message : String(error);
  document.getElementById("status")!.textContent = window.__wasmBenchmarkError;
  throw error;
}
