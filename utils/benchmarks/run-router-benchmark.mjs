import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const DEFAULT_ITERATIONS = 1_000;
const DEFAULT_SAMPLES = 7;

const options = parseArgs(process.argv.slice(2));

let browser;
let outDir;

try {
  outDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "angular-ts-router-benchmark-"),
  );

  browser = await chromium.launch({
    args: [
      "--allow-file-access-from-files",
      "--disable-gpu",
      "--disable-setuid-sandbox",
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
        input: path.join(rootDir, "utils/benchmarks/router-benchmark.html"),
      },
    },
  });

  const page = await browser.newPage();
  const url = pathToFileURL(
    await resolveBuiltHtmlFile(outDir, "router-benchmark.html"),
  );

  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));

  const pageErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
    console.error(error.stack || error.message);
  });

  await page.goto(url.toString());
  await page.waitForFunction(
    () => window.__routerBenchmarkResults || window.__routerBenchmarkError,
    undefined,
    { timeout: 120_000 },
  );

  const error = await page.evaluate(
    () => window.__routerBenchmarkError || null,
  );

  if (error) {
    throw new Error(error);
  }

  if (pageErrors.length) {
    throw new Error(
      `Router benchmark produced ${pageErrors.length} page error(s):\n${pageErrors[0]}`,
    );
  }

  const result = await page.evaluate(() => window.__routerBenchmarkResults);

  await printAndSaveBenchmarkResult({
    id: "router",
    title: "AngularTS router benchmark",
    result,
    iterationsLabel: (benchmarkResult) =>
      `Iterations: ${benchmarkResult.iterations.toLocaleString()} router`,
    groups: [
      {
        filter: () => true,
      },
    ],
  });
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
    iterations: DEFAULT_ITERATIONS,
    samples: DEFAULT_SAMPLES,
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
  console.log(`Usage: node utils/benchmarks/run-router-benchmark.mjs [options]

Options:
  --iterations <n>  Router iterations per sample.
  --samples <n>     Number of timing samples per case.
  --headful         Run Chromium with a visible window.
`);
}
