import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const DEFAULT_ITERATIONS = 100;
const DEFAULT_SAMPLES = 7;
const DEFAULT_HEAP_INSTANCES = 25;
const options = parseArgs(process.argv.slice(2));

let browser;
let outDir;

try {
  outDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "angular-ts-bootstrap-benchmark-"),
  );

  browser = await chromium.launch({
    args: [
      "--allow-file-access-from-files",
      "--disable-gpu",
      "--disable-setuid-sandbox",
      "--enable-precise-memory-info",
      "--js-flags=--expose-gc",
      "--no-sandbox",
      "--no-zygote",
      "--single-process",
    ],
    chromiumSandbox: false,
    headless: !options.headful,
  });

  const { build } = await import("vite");

  await build({
    base: "./",
    configFile: path.join(rootDir, "utils/vite.config.js"),
    logLevel: "warn",
    build: {
      emptyOutDir: true,
      outDir,
      rollupOptions: {
        input: path.join(rootDir, "utils/benchmarks/bootstrap-benchmark.html"),
      },
    },
  });

  const page = await browser.newPage();
  const pageErrors = [];
  const url = pathToFileURL(
    await resolveBuiltHtmlFile(outDir, "bootstrap-benchmark.html"),
  );

  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));
  url.searchParams.set("heapInstances", String(options.heapInstances));

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
    console.error(error.stack || error.message);
  });

  await page.goto(url.toString());
  await page.waitForFunction(
    () =>
      window.__bootstrapBenchmarkResults || window.__bootstrapBenchmarkError,
    undefined,
    { timeout: 120_000 },
  );

  const error = await page.evaluate(
    () => window.__bootstrapBenchmarkError || null,
  );

  if (error) throw new Error(error);

  if (pageErrors.length) {
    throw new Error(
      `Bootstrap benchmark produced ${pageErrors.length} page error(s):\n${pageErrors[0]}`,
    );
  }

  const result = await page.evaluate(() => window.__bootstrapBenchmarkResults);

  await printAndSaveBenchmarkResult({
    id: "bootstrap",
    title: "AngularTS bootstrap benchmark",
    result,
    iterationsLabel: (benchmarkResult) =>
      `Iterations: ${benchmarkResult.iterations.toLocaleString()} bootstrap`,
    groups: [{ filter: () => true }],
  });

  console.log("");
  console.log("Retained heap after bootstrap");
  console.table(
    result.heap.map((entry) => ({
      composition: entry.name,
      instances: entry.instances,
      "retained bytes": entry.retainedBytes,
      "bytes/runtime": Math.round(entry.bytesPerRuntime),
      "released bytes": entry.releasedBytes,
    })),
  );
} finally {
  await browser?.close();

  if (outDir) {
    await fs.rm(outDir, { force: true, recursive: true });
  }
}

async function resolveBuiltHtmlFile(directory, htmlFile) {
  const candidates = [
    path.join(directory, htmlFile),
    path.join(directory, "utils", "benchmarks", htmlFile),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);

      return candidate;
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  throw new Error(`Built benchmark HTML not found: ${htmlFile}`);
}

function parseArgs(args) {
  const parsed = {
    headful: false,
    heapInstances: DEFAULT_HEAP_INSTANCES,
    iterations: DEFAULT_ITERATIONS,
    samples: DEFAULT_SAMPLES,
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
      case "--heap-instances":
        parsed.heapInstances = readPositiveInteger(
          args[++i],
          "--heap-instances",
        );
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
  console.log(`Usage: node utils/benchmarks/run-bootstrap-benchmark.mjs [options]

Options:
  --iterations <n>     Bootstrap iterations per sample.
  --samples <n>        Number of timing samples per composition.
  --heap-instances <n> Live runtimes retained for heap measurement.
  --headful            Run Chromium with a visible window.
`);
}
