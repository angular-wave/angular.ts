#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const sourceRoot = path.join(repoRoot, "integrations/kotlin/src/jsMain/kotlin/angular/ts");

function ktFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "unsafe") return [];
      return ktFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".kt") ? [fullPath] : [];
  });
}

const rawBackedWrappers = [];
const publicRawLeaks = [];
const dynamicRawWrappers = [];
const allowedDynamicRawWrappers = new Set([
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/Animation.kt:AnimateProvider",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/Realtime.kt:NativeWebTransport",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/Services.kt:FilterFunction",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/Services.kt:HttpProvider",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/Services.kt:RestProvider",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/Services.kt:Interpolation",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/Services.kt:ParsedExpression",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/WorkerWasm.kt:WorkerService",
]);

for (const file of ktFiles(sourceRoot)) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(repoRoot, file);

  for (const match of source.matchAll(
    /public\s+class\s+([A-Za-z0-9_]+)(?:<[^>{}]+>)?\s+internal\s+constructor\s*\(\s*(public|internal|private)?\s*val\s+raw:\s*([^,\n)]+)/g,
  )) {
    const [, className, visibility = "public", rawType] = match;
    const normalizedRawType = rawType.trim();

    if (normalizedRawType.startsWith("Raw")) {
      rawBackedWrappers.push(`${relative}:${className}:${normalizedRawType}`);

      if (visibility !== "internal") {
        publicRawLeaks.push(`${relative}:${className}:${visibility} val raw`);
      }
    }

    if (normalizedRawType === "dynamic") {
      dynamicRawWrappers.push(`${relative}:${className}`);
    }
  }
}

const failures = [];

if (rawBackedWrappers.length < 35) {
  failures.push(
    `Expected at least 35 handwritten wrappers backed by generated Raw* facades; found ${rawBackedWrappers.length}.`,
  );
}

if (publicRawLeaks.length > 0) {
  failures.push(
    [
      "Generated raw facade fields must stay internal:",
      ...publicRawLeaks.map((entry) => `  - ${entry}`),
    ].join("\n"),
  );
}

const unexpectedDynamicRawWrappers = dynamicRawWrappers.filter(
  (entry) => !allowedDynamicRawWrappers.has(entry),
);
const staleDynamicRawWrapperAllowlist = [...allowedDynamicRawWrappers].filter(
  (entry) => !dynamicRawWrappers.includes(entry),
);

if (unexpectedDynamicRawWrappers.length > 0) {
  failures.push(
    [
      "Unexpected dynamic raw wrappers must be converted to generated Raw* facade delegates or explicitly reviewed:",
      ...unexpectedDynamicRawWrappers.map((entry) => `  - ${entry}`),
    ].join("\n"),
  );
}

if (staleDynamicRawWrapperAllowlist.length > 0) {
  failures.push(
    [
      "Dynamic raw wrapper allowlist contains stale entries:",
      ...staleDynamicRawWrapperAllowlist.map((entry) => `  - ${entry}`),
    ].join("\n"),
  );
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(
  `Kotlin raw wrapper delegates cover ${rawBackedWrappers.length} generated facades; ${dynamicRawWrappers.length} dynamic raw wrappers remain.`,
);
