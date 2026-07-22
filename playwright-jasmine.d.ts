import type { Page } from "@playwright/test";
import "./src/namespace.ts";

export interface JasmineFailureSummary {
  fullName: string;
  failedExpectations: string[];
}

export interface JasmineDiagnostics {
  overallStatus: string | null;
  failedSpecs: JasmineFailureSummary[];
  failedSuites: JasmineFailureSummary[];
  globalFailures: string[];
  noExpectationSpecs: string[];
  overallText: string;
  status: string | null;
  totalSpecs: number;
  pageErrors: string[];
  consoleErrors: string[];
}

export interface JasmineRunOptions {
  timeout?: number;
  allowFocusedSpecs?: boolean;
}

export function expectNoJasmineFailures(
  page: Page,
  url: string,
  options?: JasmineRunOptions,
): Promise<void>;

export function runJasminePage(
  page: Page,
  url: string,
  options?: JasmineRunOptions,
): Promise<JasmineDiagnostics>;
