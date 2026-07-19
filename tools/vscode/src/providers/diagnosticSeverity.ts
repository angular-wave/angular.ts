import type { TemplateDiagnostic } from "../templates/diagnostics";

export type DiagnosticSeveritySetting = "hint" | "information" | "warning" | "error";

export function normalizeDiagnosticSeveritySetting(
  value: unknown,
): DiagnosticSeveritySetting | undefined {
  return value === "hint" ||
    value === "information" ||
    value === "warning" ||
    value === "error"
    ? value
    : undefined;
}

export function effectiveDiagnosticSeverity(
  diagnostic: Pick<TemplateDiagnostic, "severity">,
  override: DiagnosticSeveritySetting | undefined,
): DiagnosticSeveritySetting {
  if (override) return override;
  return diagnostic.severity === "error" ? "error" : "warning";
}
