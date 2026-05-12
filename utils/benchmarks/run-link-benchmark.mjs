import { chromium } from "playwright";
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const DEFAULT_PORT = 4179;
const DEFAULT_ITERATIONS = 5_000;
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
  const url = new URL("utils/benchmarks/link-benchmark.html", baseUrl);
  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));

  const pageErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
    console.error(error.stack || error.message);
  });

  await page.goto(url.toString());
  await page.waitForFunction(
    () => window.__linkBenchmarkResults || window.__linkBenchmarkError,
    { timeout: 120_000 },
  );

  const error = await page.evaluate(() => window.__linkBenchmarkError || null);

  if (error) {
    throw new Error(error);
  }

  if (pageErrors.length) {
    throw new Error(
      `Link benchmark produced ${pageErrors.length} page error(s):\n${pageErrors[0]}`,
    );
  }

  const result = await page.evaluate(() => window.__linkBenchmarkResults);

  await printAndSaveBenchmarkResult({
    id: "link",
    title: "AngularTS link benchmark",
    result,
    iterationsLabel: (benchmarkResult) =>
      `Iterations: ${benchmarkResult.iterations.toLocaleString()} link`,
    groups: [
      {
        filter: () => true,
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

function readPositiveInteger(value, flag) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: node utils/benchmarks/run-link-benchmark.mjs [options]

Options:
  --iterations <n>  Link iterations per sample.
  --samples <n>     Number of timing samples per case.
  --port <n>        Vite server port.
  --headful         Run Chromium with a visible window.
`);
}
