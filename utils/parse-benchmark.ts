import { Lexer } from "../src/core/parse/lexer/lexer.ts";
import { Parser } from "../src/core/parse/parser/parser.ts";
import type { CompiledExpression } from "../src/core/parse/parse.ts";
import type { FilterFn } from "../src/filters/filter.ts";

type BenchmarkKind = "lexer" | "compile" | "evaluate";

type BenchmarkSummary = {
  kind: BenchmarkKind;
  name: string;
  expression: string;
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
  kind?: BenchmarkKind | "all";
};

type EvaluationCase = {
  name: string;
  expression: string;
  scope: Record<string, any>;
  locals?: Record<string, any>;
};

declare global {
  interface Window {
    __parseBenchmarkResults?: BenchmarkResult;
    __parseBenchmarkError?: string;
  }
}

const DEFAULT_ITERATIONS = 100_000;
const DEFAULT_SAMPLES = 7;
const WARMUP_ITERATIONS = 5_000;

const lexerExpressions = [
  "user.profile.name",
  "items.length && user.active",
  "value ?? fallback",
  "items | filter:query",
  "{id: item.id, name: item.name, active: item.active}",
  "sum(price, tax) >= total ? label : fallback",
];

const compileExpressions = [
  "user.profile.name",
  "items.length && user.active",
  "value ?? fallback",
  "items | filter:query",
  "{id: item.id, name: item.name, active: item.active}",
  "sum(price, tax) >= total ? label : fallback",
  "items[index].details.title",
];

const evaluationCases: EvaluationCase[] = [
  {
    name: "path: user.profile.name",
    expression: "user.profile.name",
    scope: {
      user: { profile: { name: "AngularTS" }, active: true },
    },
  },
  {
    name: "path: items.length",
    expression: "items.length",
    scope: {
      items: [1, 2, 3, 4],
    },
  },
  {
    name: "logical: a && b",
    expression: "user.active && items.length",
    scope: {
      user: { active: true },
      items: [1, 2, 3, 4],
    },
  },
  {
    name: "nullish: value ?? fallback",
    expression: "value ?? fallback",
    scope: {
      value: null,
      fallback: "fallback",
    },
  },
  {
    name: "call: sum(price, tax)",
    expression: "sum(price, tax)",
    scope: {
      price: 10,
      tax: 2,
      sum(left: number, right: number) {
        return left + right;
      },
    },
  },
  {
    name: "filter: uppercase",
    expression: "label | uppercase",
    scope: {
      label: "angular",
    },
  },
  {
    name: "object literal",
    expression: "{id: item.id, name: item.name, active: item.active}",
    scope: {
      item: { id: 1, name: "AngularTS", active: true },
    },
  },
  {
    name: "locals: item.name",
    expression: "item.name",
    scope: {},
    locals: {
      item: { name: "local" },
    },
  },
];

let sink: unknown;

function filterService(name: string): FilterFn {
  switch (name) {
    case "uppercase":
      return (input: unknown) => String(input).toUpperCase();
    case "filter":
      return (input: unknown) => input;
    default:
      throw new Error(`Unknown benchmark filter: ${name}`);
  }
}

function createParser(): Parser {
  return new Parser(new Lexer(), filterService);
}

function readOptions(): Required<BenchmarkOptions> {
  const params = new URLSearchParams(window.location.search);

  return {
    iterations: positiveInteger(params.get("iterations"), DEFAULT_ITERATIONS),
    samples: positiveInteger(params.get("samples"), DEFAULT_SAMPLES),
    kind: readKind(params.get("kind")),
  };
}

function readKind(value: string | null): BenchmarkKind | "all" {
  switch (value) {
    case "lexer":
    case "compile":
    case "evaluate":
      return value;
    case "interpreter":
      return "evaluate";
    default:
      return "all";
  }
}

function positiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function measure(
  kind: BenchmarkKind,
  name: string,
  expression: string,
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
    kind,
    name,
    expression,
    iterations,
    samples,
    minMs: sampleTimes[0],
    medianMs: sampleTimes[Math.floor(sampleTimes.length / 2)],
    meanMs,
    opsPerSecond: iterations / (meanMs / 1000),
  };
}

function runLexerBenchmarks(
  iterations: number,
  samples: number,
): BenchmarkSummary[] {
  const lexer = new Lexer();

  return lexerExpressions.map((expression) =>
    measure("lexer", expression, expression, iterations, samples, () =>
      lexer._lex(expression),
    ),
  );
}

function runCompileBenchmarks(
  iterations: number,
  samples: number,
): BenchmarkSummary[] {
  return compileExpressions.map((expression) => {
    const parser = createParser();

    return measure("compile", expression, expression, iterations, samples, () =>
      parser._parse(expression),
    );
  });
}

function runEvaluationBenchmarks(
  iterations: number,
  samples: number,
): BenchmarkSummary[] {
  const parser = createParser();

  return evaluationCases.map((benchmark) => {
    const compiled = parser._parse(benchmark.expression) as CompiledExpression;

    return measure(
      "evaluate",
      benchmark.name,
      benchmark.expression,
      iterations,
      samples,
      () => compiled(benchmark.scope as ng.Scope, benchmark.locals),
    );
  });
}

export async function runParseBenchmark(
  options: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;

  const samples = options.samples ?? DEFAULT_SAMPLES;

  const kind = options.kind ?? "all";

  const results: BenchmarkSummary[] = [];

  if (kind === "all" || kind === "lexer") {
    results.push(...runLexerBenchmarks(iterations, samples));
  }

  if (kind === "all" || kind === "compile") {
    results.push(
      ...runCompileBenchmarks(
        Math.max(1, Math.floor(iterations / 20)),
        samples,
      ),
    );
  }

  if (kind === "all" || kind === "evaluate") {
    results.push(...runEvaluationBenchmarks(iterations, samples));
  }

  return {
    userAgent: navigator.userAgent,
    iterations,
    samples,
    results,
  };
}

try {
  const options = readOptions();

  window.__parseBenchmarkResults = await runParseBenchmark(options);
  document.getElementById("status")!.textContent = "Parse benchmark complete.";
} catch (error) {
  window.__parseBenchmarkError =
    error instanceof Error ? error.stack || error.message : String(error);
  document.getElementById("status")!.textContent = window.__parseBenchmarkError;
  throw error;
} finally {
  // Keep the sink observable so engines cannot drop benchmark work entirely.
  document.body.dataset.sink = String(Boolean(sink));
}
