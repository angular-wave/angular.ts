#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const generatedPath = path.join(
  repoRoot,
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/generated/NgFacades.kt",
);

const generated = fs.readFileSync(generatedPath, "utf8");

const checks = [
  {
    message: "Expected at least one typed string array mapping.",
    passed: generated.includes("Array<String>"),
  },
  {
    message: "Expected at least one Kotlin function-type callback mapping.",
    passed: /\([^)]*\)\s*->\s*[A-Za-z_]/.test(generated),
  },
  {
    message: "Rest parameters must map to element varargs, not array varargs.",
    passed: !/\bvararg\s+p\d+:\s+Array</.test(generated),
  },
];

const failures = checks.filter((check) => !check.passed);

if (failures.length > 0) {
  for (const failure of failures) console.error(failure.message);
  process.exit(1);
}

console.log("Kotlin typed mapping coverage is present.");
