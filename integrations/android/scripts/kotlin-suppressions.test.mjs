import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const androidRoot = fileURLToPath(new URL("..", import.meta.url));
const ledger = JSON.parse(
  readFileSync(new URL("../config/kotlin-suppressions.json", import.meta.url), "utf8"),
);

function kotlinFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "build" || entry.name === ".gradle") return [];
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return kotlinFiles(path);
    return entry.isFile() && entry.name.endsWith(".kt") ? [path] : [];
  });
}

function suppressions(path, source) {
  const result = [];
  const annotation = /@(SuppressLint|Suppress)\s*\(([^)]*)\)/g;
  for (const match of source.matchAll(annotation)) {
    const rules = [...match[2].matchAll(/"([^"]+)"/g)].map((rule) => rule[1]);
    assert.ok(rules.length > 0, `${path} contains a suppression without literal rules`);
    result.push({ path, kind: match[1], rules });
  }
  return result;
}

function signature(entry) {
  return `${entry.path}|${entry.kind}|${entry.rules.join(",")}`;
}

function compare(left, right) {
  return signature(left).localeCompare(signature(right));
}

function sourceSuppressions() {
  const grouped = new Map();
  for (const file of kotlinFiles(androidRoot)) {
    const path = file.slice(androidRoot.length + 1);
    for (const entry of suppressions(path, readFileSync(file, "utf8"))) {
      const key = signature(entry);
      const existing = grouped.get(key);
      if (existing) existing.occurrences += 1;
      else grouped.set(key, { ...entry, occurrences: 1 });
    }
  }
  return [...grouped.values()].sort(compare);
}

test("suppression parser preserves explicit rule names", () => {
  assert.deepEqual(
    suppressions("Example.kt", '@Suppress("unused", "DEPRECATION")'),
    [{ path: "Example.kt", kind: "Suppress", rules: ["unused", "DEPRECATION"] }],
  );
});

test("suppression ledger is narrow, justified, unique, and sorted", () => {
  const signatures = new Set();
  for (const entry of ledger) {
    assert.ok(entry.path.endsWith(".kt"), `${entry.path} is not a Kotlin source`);
    assert.ok(entry.kind === "Suppress" || entry.kind === "SuppressLint");
    assert.ok(entry.rules.length > 0, `${entry.path} has no suppression rules`);
    assert.ok(
      entry.rules.every((rule) => rule.toLowerCase() !== "all"),
      `${entry.path} uses a blanket suppression`,
    );
    assert.ok(Number.isInteger(entry.occurrences) && entry.occurrences > 0);
    assert.ok(entry.rationale.length >= 24, `${entry.path} needs a technical rationale`);
    assert.ok(!signatures.has(signature(entry)), `${entry.path} duplicates a ledger entry`);
    signatures.add(signature(entry));
  }
  assert.deepEqual(ledger, [...ledger].sort(compare), "suppression ledger must be sorted");
});

test("checked-in Kotlin suppressions match the reviewed ledger", () => {
  const expected = ledger.map(({ rationale: _rationale, ...entry }) => entry);
  assert.deepEqual(sourceSuppressions(), expected);
});
