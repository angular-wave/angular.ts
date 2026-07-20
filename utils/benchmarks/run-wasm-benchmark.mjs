import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { printAndSaveBenchmarkResult } from "./benchmark-report.mjs";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const options = parseArgs(process.argv.slice(2));

let browser;
let outDir;

try {
  outDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "angular-ts-wasm-benchmark-"),
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
        input: path.join(rootDir, "utils/benchmarks/wasm-benchmark.html"),
      },
    },
  });

  const page = await browser.newPage();
  const pageErrors = [];
  const url = pathToFileURL(
    await resolveBuiltHtmlFile(outDir, "wasm-benchmark.html"),
  );

  url.searchParams.set("iterations", String(options.iterations));
  url.searchParams.set("samples", String(options.samples));

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
  });

  await page.goto(url.toString());
  const progress = setInterval(async () => {
    console.log(await page.locator("#status").textContent());
  }, 5_000);

  try {
    await page.waitForFunction(
      () => window.__wasmBenchmarkResults || window.__wasmBenchmarkError,
      undefined,
      { timeout: 120_000 },
    );
  } finally {
    clearInterval(progress);
  }

  const error = await page.evaluate(() => window.__wasmBenchmarkError || null);

  if (error) throw new Error(error);
  if (pageErrors.length) throw new Error(pageErrors[0]);

  const result = await page.evaluate(() => window.__wasmBenchmarkResults);

  await printAndSaveBenchmarkResult({
    id: "wasm",
    title: "AngularTS WebAssembly benchmark",
    result,
    iterationsLabel: (benchmarkResult) =>
      `Iterations: ${benchmarkResult.iterations.toLocaleString()} per case`,
    groups: [{ filter: () => true }],
  });
} finally {
  await browser?.close();

  if (outDir) await fs.rm(outDir, { force: true, recursive: true });
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
  const parsed = { headful: false, iterations: 500, samples: 7 };

  for (let i = 0; i < args.length; i++) {
    const argument = args[i];

    if (argument === "--headful") {
      parsed.headful = true;
    } else if (argument === "--iterations") {
      parsed.iterations = positiveInteger(args[++i], argument);
    } else if (argument === "--samples") {
      parsed.samples = positiveInteger(args[++i], argument);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return parsed;
}

function positiveInteger(value, flag) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }

  return parsed;
}
