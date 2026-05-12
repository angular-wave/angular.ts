import { chromium } from "playwright";
import { build } from "vite";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const DEFAULT_ITERATIONS = 5_000;
const DEFAULT_SAMPLES = 7;

const options = parseArgs(process.argv.slice(2));

let browser;
let outDir;

try {
  outDir = await fs.mkdtemp(path.join(os.tmpdir(), "angular-ts-benchmark-"));

  await build({
    base: "./",
    configFile: path.join(rootDir, "utils/vite.config.js"),
    logLevel: "warn",
    build: {
      emptyOutDir: true,
      outDir,
      rollupOptions: {
        input: {
          compile: path.join(
            rootDir,
            "utils/benchmarks/compile-benchmark.html",
          ),
          link: path.join(rootDir, "utils/benchmarks/link-benchmark.html"),
        },
      },
    },
  });

  browser = await chromium.launch({
    args: [
      "--allow-file-access-from-files",
      "--disable-setuid-sandbox",
      "--no-sandbox",
    ],
    chromiumSandbox: false,
    headless: !options.headful,
  });

  if (options.kind === "compile" || options.kind === "all") {
    const result = await runBenchmarkPage(
      browser,
      outDir,
      "compile-benchmark.html",
      "__compileBenchmarkResults",
      "__compileBenchmarkError",
      options,
    );

    await printAndSaveBenchmarkResult({
      id: "static-browser-compile",
      title: "AngularTS compile benchmark",
      result,
      iterationsLabel: (benchmarkResult) =>
        `Iterations: ${benchmarkResult.iterations.toLocaleString()} compile`,
      groups: [
        {
          filter: () => true,
        },
      ],
    });
  }

  if (options.kind === "link" || options.kind === "all") {
    const result = await runBenchmarkPage(
      browser,
      outDir,
      "link-benchmark.html",
      "__linkBenchmarkResults",
      "__linkBenchmarkError",
      options,
    );

    await printAndSaveBenchmarkResult({
      id: "static-browser-link",
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
  }
} finally {
  await browser?.close();

  if (outDir) {
    await fs.rm(outDir, { force: true, recursive: true });
  }
}

async function runBenchmarkPage(
  browser,
  outDir,
  htmlFile,
  resultKey,
  errorKey,
  options,
) {
  const page = await browser.newPage();

  const pageErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
    console.error(error.stack || error.message);
  });

  const url = pathToFileURL(await resolveBuiltHtmlFile(outDir, htmlFile));
  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));

  await page.goto(url.toString());
  await page.waitForFunction(
    ({ resultKey, errorKey }) => window[resultKey] || window[errorKey],
    { resultKey, errorKey },
    { timeout: 120_000 },
  );

  const error = await page.evaluate(
    (errorKey) => window[errorKey] || null,
    errorKey,
  );

  if (error) {
    throw new Error(error);
  }

  if (pageErrors.length) {
    throw new Error(
      `${htmlFile} produced ${pageErrors.length} page error(s):\n${pageErrors[0]}`,
    );
  }

  return page.evaluate((resultKey) => window[resultKey], resultKey);
}

async function resolveBuiltHtmlFile(outDir, htmlFile) {
  const candidates = [
    path.join(outDir, htmlFile),
    path.join(outDir, "utils", "benchmarks", htmlFile),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);

      return candidate;
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(`Built benchmark HTML not found: ${htmlFile}`);
}

function parseArgs(args) {
  const parsed = {
    headful: false,
    iterations: DEFAULT_ITERATIONS,
    kind: "all",
    samples: DEFAULT_SAMPLES,
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
  console.log(`Usage: node utils/benchmarks/run-static-browser-benchmark.mjs [options]

Options:
  --kind <name>     One of: compile, link, all.
  --iterations <n>  Iterations per sample.
  --samples <n>     Number of timing samples per case.
  --headful         Run Chromium with a visible window.
`);
}
