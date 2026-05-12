import { chromium } from "playwright";
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const DEFAULT_PORT = 4177;
const DEFAULT_ITERATIONS = 100_000;
const DEFAULT_SAMPLES = 7;

const options = parseArgs(process.argv.slice(2));

let server;
let browser;

try {
  server = await createServer({
    configFile: path.join(rootDir, "utils/vite.config.js"),
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
  const page = await browser.newPage();
  const url = new URL("utils/benchmarks/parse-benchmark.html", baseUrl);
  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));
  url.searchParams.set("kind", options.kind);

  page.on("pageerror", (error) => {
    console.error(error.stack || error.message);
  });

  await page.goto(url.toString());
  await page.waitForFunction(
    () => window.__parseBenchmarkResults || window.__parseBenchmarkError,
    { timeout: 120_000 },
  );

  const error = await page.evaluate(() => window.__parseBenchmarkError || null);

  if (error) {
    throw new Error(error);
  }

  const result = await page.evaluate(() => window.__parseBenchmarkResults);

  await printAndSaveBenchmarkResult({
    id: `parse-${options.kind}`,
    title: "AngularTS parse benchmark",
    result,
    iterationsLabel: (benchmarkResult) =>
      `Iterations: ${benchmarkResult.iterations.toLocaleString()} eval/lexer, ${Math.max(
        1,
        Math.floor(benchmarkResult.iterations / 20),
      ).toLocaleString()} compile`,
    groups: [
      {
        title: "lexer",
        filter: (entry) => entry.kind === "lexer",
      },
      {
        title: "compile",
        filter: (entry) => entry.kind === "compile",
      },
      {
        title: "evaluate",
        filter: (entry) => entry.kind === "evaluate",
      },
    ],
  });
} finally {
  await browser?.close();
  await server?.close();
}

function parseArgs(args) {
  const parsed = {
    iterations: DEFAULT_ITERATIONS,
    samples: DEFAULT_SAMPLES,
    kind: "all",
    port: Number(process.env.PORT || DEFAULT_PORT),
    headful: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--iterations":
        parsed.iterations = readPositiveInteger(args[++i], "--iterations");
        break;
      case "--samples":
        parsed.samples = readPositiveInteger(args[++i], "--samples");
        break;
      case "--kind":
        parsed.kind = readKind(args[++i]);
        break;
      case "--port":
        parsed.port = readPositiveInteger(args[++i], "--port");
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

  return parsed;
}

function readKind(value) {
  switch (value) {
    case "all":
    case "lexer":
    case "compile":
    case "evaluate":
      return value;
    case "interpreter":
      return "evaluate";
    default:
      throw new Error(
        "--kind expects one of: all, lexer, compile, evaluate, interpreter.",
      );
  }
}

function readPositiveInteger(value, flag) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: node utils/benchmarks/run-parse-benchmark.mjs [options]

Options:
  --iterations <n>  Evaluation and lexer iterations per sample.
  --samples <n>     Number of timing samples per case.
  --kind <kind>      Benchmark kind: all, lexer, compile, evaluate, interpreter.
  --port <n>        Vite server port.
  --headful         Run Chromium with a visible window.
`);
}
