import test from "node:test";
import assert from "node:assert/strict";
import {
  effectiveDiagnosticSeverity,
  normalizeDiagnosticSeveritySetting,
} from "../providers/diagnosticSeverity";

test("normalizes supported diagnostic severity settings", () => {
  assert.equal(normalizeDiagnosticSeveritySetting("hint"), "hint");
  assert.equal(normalizeDiagnosticSeveritySetting("information"), "information");
  assert.equal(normalizeDiagnosticSeveritySetting("warning"), "warning");
  assert.equal(normalizeDiagnosticSeveritySetting("error"), "error");
  assert.equal(normalizeDiagnosticSeveritySetting("debug"), undefined);
});

test("applies diagnostic severity override or collector default", () => {
  assert.equal(
    effectiveDiagnosticSeverity({ severity: "warning" }, undefined),
    "warning",
  );
  assert.equal(
    effectiveDiagnosticSeverity({ severity: "error" }, undefined),
    "error",
  );
  assert.equal(
    effectiveDiagnosticSeverity({ severity: "warning" }, "information"),
    "information",
  );
});
