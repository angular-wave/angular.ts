import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";
const DEFAULT_TIMEOUT = 120_000;
const MAX_FAILURES = 10;
const MAX_MESSAGES = 3;
const MAX_LOG_LINES = 10;
const COVERAGE_ENABLED = process.env.PW_COVERAGE === "1";
const COVERAGE_TEMP_DIR = fileURLToPath(
  new URL("./.coverage/tmp/", import.meta.url),
);
let coverageArtifactId = 0;
/**
 * Runs a Jasmine HTML runner from an existing Playwright test and reports
 * explicit spec failures when the suite finishes.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} url
 * @param {{ timeout?: number, allowFocusedSpecs?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function expectNoJasmineFailures(page, url, options = {}) {
  const diagnostics = await runJasminePage(page, url, options);
  const effectiveOverallStatus = isAcceptableJasmineStatus(diagnostics, options)
    ? "passed"
    : diagnostics.overallStatus;
  expect(
    {
      overallStatus: effectiveOverallStatus,
      failedSpecs: diagnostics.failedSpecs,
      failedSuites: diagnostics.failedSuites,
      globalFailures: diagnostics.globalFailures,
    },
    formatJasmineFailureReport(url, diagnostics),
  ).toEqual({
    overallStatus: "passed",
    failedSpecs: [],
    failedSuites: [],
    globalFailures: [],
  });
}

function isAcceptableJasmineStatus(diagnostics, options) {
  if (diagnostics.overallStatus === "passed") {
    return true;
  }

  return isFocusedJasmineRunWithoutFailures(diagnostics, options);
}

function isFocusedJasmineRunWithoutFailures(diagnostics, options) {
  if (options.allowFocusedSpecs === false) {
    return false;
  }

  if (diagnostics.overallStatus !== "incomplete") {
    return false;
  }

  if (
    diagnostics.failedSpecs.length > 0 ||
    diagnostics.failedSuites.length > 0 ||
    diagnostics.globalFailures.length > 0
  ) {
    return false;
  }

  return true;
}
/**
 * Waits for the browser-side Jasmine runner to finish and collects failures.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} url
 * @param {{ timeout?: number, allowFocusedSpecs?: boolean }} [options]
 * @returns {Promise<JasmineDiagnostics>}
 */
export async function runJasminePage(page, url, options = {}) {
  const pageErrors = [];
  const consoleErrors = [];
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await page.goto(url);
  try {
    try {
      await page.waitForFunction(
        () =>
          typeof window.jsApiReporter?.status === "function" &&
          window.jsApiReporter.status() === "done",
        { timeout },
      );
    } catch (error) {
      const diagnostics = await collectJasmineDiagnostics(page);
      diagnostics.pageErrors = pageErrors;
      diagnostics.consoleErrors = consoleErrors;
      throw new Error(formatJasmineFailureReport(url, diagnostics), {
        cause: error,
      });
    }
    const diagnostics = await collectJasmineDiagnostics(page);
    diagnostics.pageErrors = pageErrors;
    diagnostics.consoleErrors = consoleErrors;
    return diagnostics;
  } finally {
    await savePageCoverage(page, url);
  }
}
// noinspection JSUnusedGlobalSymbols
export async function withPageCoverage(page, label, action) {
  try {
    return await action();
  } finally {
    await savePageCoverage(page, label);
  }
}
/**
 * Reads Jasmine reporter output from the page and normalizes it into a small
 * object the Playwright wrapper can assert on.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<JasmineDiagnostics>}
 */
async function collectJasmineDiagnostics(page) {
  return page.evaluate(() => {
    const reporter = window.jsApiReporter;
    const overallText =
      document.querySelector(".jasmine-overall-result")?.textContent?.trim() ||
      "";
    const status =
      typeof reporter?.status === "function" ? reporter.status() : null;
    const specs =
      typeof reporter?.specResults === "function" ? reporter.specResults() : [];
    const suites =
      typeof reporter?.suiteResults === "function"
        ? reporter.suiteResults()
        : [];
    const runDetails =
      reporter && typeof reporter.runDetails === "object"
        ? reporter.runDetails
        : {};
    const failedSpecs = specs
      .filter((spec) => spec.status === "failed")
      .map((spec) => ({
        fullName: spec.fullName,
        failedExpectations: (spec.failedExpectations || []).map(
          (expectation) => expectation.message,
        ),
      }));
    const failedSuites = suites
      .filter((suite) => suite.status === "failed")
      .map((suite) => ({
        fullName: suite.fullName,
        failedExpectations: (suite.failedExpectations || []).map(
          (expectation) => expectation.message,
        ),
      }));
    const noExpectationSpecs = specs
      .filter(
        (spec) =>
          (spec.passedExpectations || []).length === 0 &&
          (spec.failedExpectations || []).length === 0,
      )
      .map((spec) => spec.fullName);
    const globalFailures = (runDetails.failedExpectations || []).map(
      (expectation) => expectation.message,
    );
    return {
      failedSpecs,
      failedSuites,
      globalFailures,
      noExpectationSpecs,
      overallText,
      overallStatus:
        typeof runDetails.overallStatus === "string"
          ? runDetails.overallStatus
          : null,
      status,
      totalSpecs: specs.length,
      pageErrors: [],
      consoleErrors: [],
    };
  });
}
/**
 * Builds a human-readable assertion message with the failed spec names and
 * expectation messages pulled from Jasmine.
 *
 * @param {string} url
 * @param {JasmineDiagnostics} diagnostics
 * @returns {string}
 */
function formatJasmineFailureReport(url, diagnostics) {
  const lines = [`Jasmine failures for ${url}`];
  if (diagnostics.status && diagnostics.status !== "done") {
    lines.push(`Status: ${diagnostics.status}`);
  }
  if (diagnostics.overallStatus) {
    lines.push(`Overall status: ${diagnostics.overallStatus}`);
  }
  if (diagnostics.overallText) {
    lines.push(`Summary: ${diagnostics.overallText}`);
  }
  if (diagnostics.totalSpecs) {
    lines.push(`Total specs: ${diagnostics.totalSpecs}`);
  }
  if (diagnostics.failedSpecs.length > 0) {
    lines.push("Failed specs:");
    diagnostics.failedSpecs.slice(0, MAX_FAILURES).forEach((spec, index) => {
      lines.push(`${index + 1}. ${spec.fullName}`);
      spec.failedExpectations.slice(0, MAX_MESSAGES).forEach((message) => {
        lines.push(`   - ${message}`);
      });
    });
    if (diagnostics.failedSpecs.length > MAX_FAILURES) {
      lines.push(
        `... ${diagnostics.failedSpecs.length - MAX_FAILURES} more failed specs`,
      );
    }
  }
  if (diagnostics.failedSuites.length > 0) {
    lines.push("Failed suites:");
    diagnostics.failedSuites.slice(0, MAX_FAILURES).forEach((suite, index) => {
      lines.push(`${index + 1}. ${suite.fullName}`);
      suite.failedExpectations.slice(0, MAX_MESSAGES).forEach((message) => {
        lines.push(`   - ${message}`);
      });
    });
    if (diagnostics.failedSuites.length > MAX_FAILURES) {
      lines.push(
        `... ${diagnostics.failedSuites.length - MAX_FAILURES} more failed suites`,
      );
    }
  }
  if (diagnostics.globalFailures.length > 0) {
    lines.push("Global failures:");
    diagnostics.globalFailures.slice(0, MAX_FAILURES).forEach((message) => {
      lines.push(`- ${message}`);
    });
    if (diagnostics.globalFailures.length > MAX_FAILURES) {
      lines.push(
        `... ${diagnostics.globalFailures.length - MAX_FAILURES} more global failures`,
      );
    }
  }
  if (diagnostics.noExpectationSpecs.length > 0) {
    lines.push("Specs with no expectations:");
    diagnostics.noExpectationSpecs
      .slice(0, MAX_FAILURES)
      .forEach((fullName, index) => {
        lines.push(`${index + 1}. ${fullName}`);
      });
    if (diagnostics.noExpectationSpecs.length > MAX_FAILURES) {
      lines.push(
        `... ${diagnostics.noExpectationSpecs.length - MAX_FAILURES} more specs with no expectations`,
      );
    }
  }
  if (
    diagnostics.failedSpecs.length === 0 &&
    diagnostics.failedSuites.length === 0 &&
    diagnostics.globalFailures.length === 0 &&
    diagnostics.noExpectationSpecs.length === 0
  ) {
    lines.push("No failed specs, suites, or global failures were reported.");
  }
  appendLogSection(lines, "Page errors", diagnostics.pageErrors);
  appendLogSection(lines, "Console errors", diagnostics.consoleErrors);
  return lines.join("\n");
}
/**
 * Adds captured browser-side errors to the failure report without letting the
 * output become excessively large.
 *
 * @param {string[]} lines
 * @param {string} label
 * @param {string[]} values
 * @returns {void}
 */
function appendLogSection(lines, label, values) {
  if (values.length === 0) {
    return;
  }
  lines.push(`${label}:`);
  values.slice(0, MAX_LOG_LINES).forEach((value) => {
    lines.push(`- ${value}`);
  });
  if (values.length > MAX_LOG_LINES) {
    lines.push(`... ${values.length - MAX_LOG_LINES} more`);
  }
}
async function savePageCoverage(page, label) {
  if (!COVERAGE_ENABLED) {
    return;
  }
  const coverage = await page
    .evaluate(() => globalThis.__coverage__ || window.__coverage__ || null)
    .catch(() => null);
  if (!coverage || Object.keys(coverage).length === 0) {
    return;
  }
  coverageArtifactId += 1;
  await mkdir(COVERAGE_TEMP_DIR, { recursive: true });
  await writeFile(
    path.join(
      COVERAGE_TEMP_DIR,
      `${process.pid}-${coverageArtifactId}-${sanitizeCoverageLabel(label)}.json`,
    ),
    JSON.stringify(coverage),
    "utf8",
  );
}
function sanitizeCoverageLabel(label) {
  return (
    String(label)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "page"
  );
}
/**
 * @typedef {{
 *   failedSpecs: Array<{
 *     fullName: string,
 *     failedExpectations: string[],
 *   }>,
 *   failedSuites: Array<{
 *     fullName: string,
 *     failedExpectations: string[],
 *   }>,
 *   globalFailures: string[],
 *   noExpectationSpecs: string[],
 *   overallText: string,
 *   overallStatus: string | null,
 *   status: string | null,
 *   totalSpecs: number,
 *   pageErrors: string[],
 *   consoleErrors: string[],
 * }} JasmineDiagnostics
 */
