import type { Page } from "@playwright/test";
import "./src/namespace.ts";

export interface JasmineFailureSummary {
  fullName?: string;
  message?: string;
  stack?: string;
}

export interface JasmineDiagnostics {
  overallStatus: string;
  failedSpecs: JasmineFailureSummary[];
  failedSuites: JasmineFailureSummary[];
  globalFailures: JasmineFailureSummary[];
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
