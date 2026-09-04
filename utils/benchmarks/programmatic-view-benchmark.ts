import { Angular } from "../../src/angular.ts";
import { each, li, ul } from "../../src/core/compile/programmatic-view.ts";

interface Item {
  readonly id: number;
  readonly label: string;
}

interface BenchmarkSummary {
  readonly name: string;
  readonly template: string;
  readonly iterations: number;
  readonly samples: number;
  readonly minMs: number;
  readonly medianMs: number;
  readonly meanMs: number;
  readonly opsPerSecond: number;
}

interface BenchmarkResult {
  readonly userAgent: string;
  readonly iterations: number;
  readonly samples: number;
  readonly results: readonly BenchmarkSummary[];
}

declare global {
  interface Window {
    __programmaticViewBenchmarkResults?: BenchmarkResult;
    __programmaticViewBenchmarkError?: string;
  }
}

const params = new URLSearchParams(location.search);
const iterations = Number(params.get("iterations")) || 500;
const samples = Number(params.get("samples")) || 7;
const root = document.getElementById("benchmark-root")!;
const angular = new Angular();
const app = angular.createModule("programmaticViewBenchmark", ["ng"]);
let scope: ng.Scope & { items: Item[] };

app.component("keyedBenchmark", {
  view: (context) => {
    scope = context.scope as typeof scope;
    scope.items = createItems(100, 0);

    return ul(
      each(
        () => scope.items,
        (item) => item.id,
        (item) => li({ "data-id": () => item().id }, () => item().label),
      ),
    );
  },
});

root.innerHTML = "<keyed-benchmark></keyed-benchmark>";
angular.bootstrap(root, [app.name]);

function createItems(length: number, offset: number): Item[] {
  return Array.from({ length }, (_, index) => ({
    id: offset + index,
    label: `item-${offset + index}`,
  }));
}

async function commit(items: Item[]): Promise<void> {
  scope.items = items;
  await Promise.resolve();
}

async function measure(
  name: string,
  operation: (step: number) => Item[],
): Promise<BenchmarkSummary> {
  const times: number[] = [];

  for (let warmup = 0; warmup < 50; warmup++) {
    await commit(operation(warmup));
  }

  for (let sample = 0; sample < samples; sample++) {
    const startedAt = performance.now();

    for (let step = 0; step < iterations; step++) {
      await commit(operation(step));
    }

    times.push(performance.now() - startedAt);
    await Promise.resolve();
  }

  times.sort((left, right) => left - right);
  const meanMs = times.reduce((sum, value) => sum + value, 0) / times.length;

  return {
    name,
    template: "each(100 keyed items)",
    iterations,
    samples,
    minMs: times[0],
    medianMs: times[Math.floor(times.length / 2)],
    meanMs,
    opsPerSecond: iterations / (meanMs / 1000),
  };
}

try {
  const base = createItems(100, 0);
  const alternate = createItems(100, 1_000);
  const cases: readonly [string, (step: number) => Item[]][] = [
    [
      "append/remove",
      (step) => (step % 2 ? base : [...base, { id: 100, label: "appended" }]),
    ],
    [
      "prepend/remove",
      (step) => (step % 2 ? base : [{ id: 101, label: "prepended" }, ...base]),
    ],
    [
      "swap",
      (step) => {
        const items = base.slice();
        if (step % 2 === 0) [items[20], items[80]] = [items[80], items[20]];
        return items;
      },
    ],
    ["reverse", (step) => (step % 2 ? base : base.slice().reverse())],
    [
      "sparse replacement",
      (step) => {
        const items = base.slice();
        items[50] = { ...items[50], label: `changed-${step % 2}` };
        return items;
      },
    ],
    ["disjoint replacement", (step) => (step % 2 ? base : alternate)],
  ];
  const results: BenchmarkSummary[] = [];

  for (const [name, operation] of cases) {
    await commit(base);
    results.push(await measure(name, operation));
  }

  window.__programmaticViewBenchmarkResults = {
    userAgent: navigator.userAgent,
    iterations,
    samples,
    results,
  };
  document.getElementById("status")!.textContent = "Benchmark complete.";
} catch (error) {
  window.__programmaticViewBenchmarkError =
    error instanceof Error ? error.stack || error.message : String(error);
  throw error;
}
