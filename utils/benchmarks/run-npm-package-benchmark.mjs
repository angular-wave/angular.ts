import { chromium } from "playwright";
import { createServer } from "vite";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const resultDir = path.join(rootDir, "utils", "benchmarks", "results");

const DEFAULT_ITERATIONS = 5_000;
const DEFAULT_PORT = 4180;
const DEFAULT_SAMPLES = 7;
const PACKAGE_NAME = "@angular-wave/angular.ts";

const options = parseArgs(process.argv.slice(2));

const workspaceBaselines = await refreshWorkspaceBaselines(options);

let browser;
let server;
let tempDir;

try {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "angular-ts-npm-bench-"));
  await writeBenchmarkPackage(tempDir, options);
  installPackage(tempDir, options);

  server = await createServer({
    root: tempDir,
    server: {
      port: options.port,
      strictPort: false,
    },
  });
  await server.listen();

  const baseUrl = server.resolvedUrls?.local?.[0];

  if (!baseUrl) {
    throw new Error("Vite did not report a local server URL.");
  }

  browser = await chromium.launch({ headless: !options.headful });

  if (options.kind === "compile" || options.kind === "all") {
    const result = await runBenchmarkPage(
      browser,
      baseUrl,
      "compile-benchmark.html",
      "__compileBenchmarkResults",
      "__compileBenchmarkError",
      options,
    );

    await printAndSaveBenchmarkResult({
      id: npmResultId(options.version, "compile"),
      title: `${PACKAGE_NAME}@${options.version} compile benchmark`,
      result,
      iterationsLabel: (benchmarkResult) =>
        `Iterations: ${benchmarkResult.iterations.toLocaleString()} compile`,
      groups: [
        {
          filter: () => true,
        },
      ],
    });

    printWorkspaceComparison(
      "compile",
      result,
      workspaceBaselines.get("compile"),
    );
  }

  if (options.kind === "link" || options.kind === "all") {
    const result = await runBenchmarkPage(
      browser,
      baseUrl,
      "link-benchmark.html",
      "__linkBenchmarkResults",
      "__linkBenchmarkError",
      options,
    );

    await printAndSaveBenchmarkResult({
      id: npmResultId(options.version, "link"),
      title: `${PACKAGE_NAME}@${options.version} link benchmark`,
      result,
      iterationsLabel: (benchmarkResult) =>
        `Iterations: ${benchmarkResult.iterations.toLocaleString()} link`,
      groups: [
        {
          filter: () => true,
        },
      ],
    });

    printWorkspaceComparison("link", result, workspaceBaselines.get("link"));
  }
} finally {
  await browser?.close();
  await server?.close();

  if (tempDir) {
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}

async function writeBenchmarkPackage(dir, options) {
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        dependencies: {
          [PACKAGE_NAME]: options.version,
        },
        devDependencies: {},
      },
      null,
      2,
    ),
  );

  await fs.writeFile(
    path.join(dir, "compile-link-benchmark-cases.ts"),
    await fs.readFile(
      path.join(
        rootDir,
        "utils",
        "benchmarks",
        "compile-link-benchmark-cases.ts",
      ),
      "utf8",
    ),
  );

  await fs.writeFile(
    path.join(dir, "compile-benchmark.html"),
    benchmarkHtml("compile"),
  );
  await fs.writeFile(
    path.join(dir, "link-benchmark.html"),
    benchmarkHtml("link"),
  );
  await fs.writeFile(
    path.join(dir, "compile-benchmark.ts"),
    benchmarkTs("compile"),
  );
  await fs.writeFile(
    path.join(dir, "link-benchmark.ts"),
    benchmarkTs("link"),
  );
}

function installPackage(dir, options) {
  const install = spawnSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      `${PACKAGE_NAME}@${options.version}`,
    ],
    {
      cwd: dir,
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (install.status !== 0) {
    throw new Error(
      `npm install failed for ${PACKAGE_NAME}@${options.version}\n${install.stdout}\n${install.stderr}`,
    );
  }
}

async function runBenchmarkPage(
  browser,
  baseUrl,
  htmlFile,
  resultKey,
  errorKey,
  options,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  const url = new URL(htmlFile, baseUrl);

  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
    console.error(error.stack || error.message);
  });

  try {
    await page.goto(url.toString(), {
      timeout: 120_000,
      waitUntil: "domcontentloaded",
    });
    const resultHandle = await page.waitForFunction(
      ({ resultKey, errorKey }) => {
        const error = window[errorKey];

        if (error) {
          return { error };
        }

        const result = window[resultKey];

        if (result) {
          return { result };
        }

        return null;
      },
      { resultKey, errorKey },
      { timeout: 120_000 },
    );
    const payload = await resultHandle.jsonValue();
    const error = payload?.error;

    if (error) {
      throw new Error(error);
    }

    if (pageErrors.length) {
      throw new Error(
        `${htmlFile} produced ${pageErrors.length} page error(s):\n${pageErrors[0]}`,
      );
    }

    return payload?.result;
  } finally {
    await context.close();
  }
}

function benchmarkHtml(kind) {
  const title = kind === "compile" ? "Compile" : "Link";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>AngularTS npm ${title} Benchmark</title>
  </head>
  <body>
    <div id="benchmark-root"></div>
    <pre id="status">Running ${kind} benchmark...</pre>
    <script type="module" src="/${kind}-benchmark.ts"></script>
  </body>
</html>
`;
}

function benchmarkTs(kind) {
  return `import { Angular } from "./node_modules/@angular-wave/angular.ts/dist/angular.js";
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
type LinkFn = (
  scope: Scope,
  cloneAttachFn?: CloneAttachFn,
) => Element | Node | ChildNode | Node[];
type CloneAttachFn = (clone: Node[], scope: Scope) => void;
type Scope = {
  $destroy(): void;
  $new(): Scope;
} & Record<string, unknown>;

declare global {
  interface Window {
    __compileBenchmarkResults?: BenchmarkResult;
    __compileBenchmarkError?: string;
    __linkBenchmarkResults?: BenchmarkResult;
    __linkBenchmarkError?: string;
    angular?: unknown;
  }
}

const DEFAULT_ITERATIONS = ${DEFAULT_ITERATIONS};
const DEFAULT_SAMPLES = ${DEFAULT_SAMPLES};
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

function createRuntimeServices(): { $compile: CompileService; $rootScope: Scope } {
  const angular = new Angular();
  const root = document.getElementById("benchmark-root")!;
  root.innerHTML = "";
  window.angular = angular;

  const injector = angular.bootstrap(root, ["ng"]);

  return {
    $compile: injector.get("$compile") as CompileService,
    $rootScope: injector.get("$rootScope") as Scope,
  };
}

${kind === "link" ? "async " : ""}function measure(
  name: string,
  template: string,
  iterations: number,
  samples: number,
  action: () => unknown,
): ${kind === "link" ? "Promise<BenchmarkSummary>" : "BenchmarkSummary"} {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    sink = action();
  }

  ${kind === "link" ? "await Promise.resolve();" : ""}

  const sampleTimes: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    const startedAt = performance.now();

    for (let i = 0; i < iterations; i++) {
      sink = action();
    }

    sampleTimes.push(performance.now() - startedAt);
    ${kind === "link" ? "await Promise.resolve();" : ""}
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
  const scope = $rootScope.$new();

  if (createScopeData) {
    Object.assign(scope, createScopeData());
  }

  try {
    return linkFn(scope, captureClone);
  } finally {
    scope.$destroy();
  }
}

const captureClone: CloneAttachFn = (clone) => {
  sink = clone;
};

async function runBenchmark(options: BenchmarkOptions = {}): Promise<BenchmarkResult> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const samples = options.samples ?? DEFAULT_SAMPLES;
  const { $compile, $rootScope } = createRuntimeServices();
  const results: BenchmarkSummary[] = [];

  for (const benchmark of compileLinkBenchmarkCases${kind === "link" ? ".filter((candidate) => candidate.includeInLink !== false)" : ""}) {
    ${
        kind === "link"
          ? `const linkFn = $compile(benchmark.template);

      results.push(await measure(
        benchmark.name,
        benchmark.template,
        iterations,
        samples,
        () => linkWithNewScope(linkFn, $rootScope, benchmark.createScopeData),
      ));`
          : `results.push(measure(benchmark.name, benchmark.template, iterations, samples, () =>
        $compile(benchmark.template),
      ));`
      }
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
  const result = await runBenchmark(options);
  window.${kind === "compile" ? "__compileBenchmarkResults" : "__linkBenchmarkResults"} = result;
  document.getElementById("status")!.textContent = "${kind} benchmark complete.";
} catch (error) {
  window.${kind === "compile" ? "__compileBenchmarkError" : "__linkBenchmarkError"} =
    error instanceof Error ? error.stack || error.message : String(error);
  document.getElementById("status")!.textContent =
    window.${kind === "compile" ? "__compileBenchmarkError" : "__linkBenchmarkError"};
  throw error;
} finally {
  document.body.dataset.sink = String(Boolean(sink));
}
`;
}

async function refreshWorkspaceBaselines(options) {
  const kinds = options.kind === "all" ? ["compile", "link"] : [options.kind];
  const baselines = new Map();

  for (const kind of kinds) {
    const baselinePath = path.join(resultDir, `${kind}.json`);
    const previous = await readOptionalFile(baselinePath);

    try {
      const result = spawnSync(
        process.execPath,
        [
          path.join(
            rootDir,
            "utils",
            "benchmarks",
            `run-${kind}-benchmark.mjs`,
          ),
          "--iterations",
          String(options.iterations),
          "--samples",
          String(options.samples),
        ],
        {
          cwd: rootDir,
          encoding: "utf8",
          stdio: "inherit",
        },
      );

      if (result.status !== 0) {
        throw new Error(`Workspace ${kind} benchmark failed.`);
      }

      const current = JSON.parse(await fs.readFile(baselinePath, "utf8"));

      baselines.set(kind, current.result);
    } finally {
      if (previous === undefined) {
        await fs.rm(baselinePath, { force: true });
      } else {
        await fs.writeFile(baselinePath, previous);
      }
    }
  }

  return baselines;
}

function printWorkspaceComparison(kind, packageResult, current) {
  if (!current) {
    return;
  }

  console.log("");
  console.log(`Comparison against current workspace ${kind} baseline`);
  console.table(
    packageResult.results.map((entry) => {
      const currentEntry = current.results.find(
        (candidate) => candidate.name === entry.name,
      );

      if (!currentEntry) {
        return {
          case: entry.name,
          "npm ops/sec": formatInteger(entry.opsPerSecond),
          "current ops/sec": "n/a",
          "current vs npm": "n/a",
          "npm median us/op": formatMicrosecondsPerOperation(
            entry.medianMs,
            packageResult.iterations,
          ),
          "current median us/op": "n/a",
        };
      }

      return {
        case: entry.name,
        "npm ops/sec": formatInteger(entry.opsPerSecond),
        "current ops/sec": formatInteger(currentEntry.opsPerSecond),
        "current vs npm": formatPercentChange(
          currentEntry.opsPerSecond,
          entry.opsPerSecond,
        ),
        "npm median us/op": formatMicrosecondsPerOperation(
          entry.medianMs,
          packageResult.iterations,
        ),
        "current median us/op": formatMicrosecondsPerOperation(
          currentEntry.medianMs,
          current.iterations,
        ),
      };
    }),
  );
}

async function readOptionalFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function npmResultId(version, kind) {
  return `npm-${version.replaceAll(".", "-")}-${kind}`;
}

function formatPercentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || !previous) {
    return "n/a";
  }

  const percent = ((current - previous) / previous) * 100;
  const prefix = percent > 0 ? "+" : "";

  return `${prefix}${percent.toFixed(1)}%`;
}

function formatInteger(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return Math.round(value).toLocaleString();
}

function formatMicrosecondsPerOperation(milliseconds, iterations) {
  if (!Number.isFinite(milliseconds) || !iterations) {
    return "n/a";
  }

  return ((milliseconds * 1_000) / iterations).toFixed(2);
}

function parseArgs(args) {
  const parsed = {
    headful: false,
    iterations: DEFAULT_ITERATIONS,
    kind: "all",
    port: Number(process.env.PORT || DEFAULT_PORT),
    samples: DEFAULT_SAMPLES,
    version: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--kind":
        parsed.kind = readKind(args[++i]);
        break;
      case "--iterations":
        parsed.iterations = readPositiveInteger(args[++i], "--iterations");
        break;
      case "--port":
        parsed.port = readPositiveInteger(args[++i], "--port");
        break;
      case "--samples":
        parsed.samples = readPositiveInteger(args[++i], "--samples");
        break;
      case "--version":
        parsed.version = args[++i];
        break;
      case "--headful":
        parsed.headful = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.version) {
    throw new Error("--version expects a package version.");
  }

  return parsed;
}

function readKind(value) {
  if (value === "compile" || value === "link" || value === "all") {
    return value;
  }

  throw new Error("--kind expects compile, link, or all.");
}

function readPositiveInteger(value, flag) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: node utils/benchmarks/run-npm-package-benchmark.mjs [options]

Options:
  --version <v>     Package version to install. Required.
  --kind <name>     One of: compile, link, all.
  --iterations <n>  Iterations per sample.
  --samples <n>     Number of timing samples per case.
  --port <n>        Vite server port.
  --headful         Run Chromium with a visible window.
`);
}
