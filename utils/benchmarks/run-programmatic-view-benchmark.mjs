import { chromium } from "playwright";
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const options = parseArgs(process.argv.slice(2));
let server;
let browser;

try {
  server = await createServer({
    configFile: path.join(rootDir, "utils/vite.config.js"),
    server: { port: options.port, strictPort: false },
  });
  await server.listen();

  const baseUrl = server.resolvedUrls?.local?.[0];
  if (!baseUrl) throw new Error("Vite did not report a local server URL.");

  browser = await chromium.launch({ headless: !options.headful });
  const page = await browser.newPage();
  const url = new URL(
    "utils/benchmarks/programmatic-view-benchmark.html",
    baseUrl,
  );
  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));
  await page.goto(url.toString(), {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () =>
      window.__programmaticViewBenchmarkResults ||
      window.__programmaticViewBenchmarkError,
    undefined,
    { timeout: 120_000 },
  );

  const error = await page.evaluate(
    () => window.__programmaticViewBenchmarkError || null,
  );
  if (error) throw new Error(error);

  const result = await page.evaluate(
    () => window.__programmaticViewBenchmarkResults,
  );
  await printAndSaveBenchmarkResult({
    id: "programmatic-view",
    title: "AngularTS programmatic view benchmark",
    result,
    iterationsLabel: (value) =>
      `Iterations: ${value.iterations.toLocaleString()} updates`,
    groups: [{ filter: () => true }],
  });
} finally {
  await browser?.close();
  await server?.close();
}

function parseArgs(args) {
  const options = {
    iterations: 500,
    samples: 7,
    port: Number(process.env.PORT || 4183),
    headful: false,
  };

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (argument === "--headful") options.headful = true;
    else if (argument === "--iterations") {
      options.iterations = positiveInteger(args[++index], argument);
    } else if (argument === "--samples") {
      options.samples = positiveInteger(args[++index], argument);
    } else if (argument === "--port") {
      options.port = positiveInteger(args[++index], argument);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function positiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }
  return parsed;
}
