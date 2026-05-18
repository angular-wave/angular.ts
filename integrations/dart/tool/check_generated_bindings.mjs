#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { generateBindings } from "./generate_dart_bindings.mjs";

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const outputPath = resolve(repoRoot, "integrations/dart/lib/src/generated/ng_facades.dart");
const expected = formatDart(generateBindings({ repoRoot }));
const actual = readFileSync(outputPath, "utf8");

if (actual === expected) {
  console.log("Generated Dart bindings are up to date.");
  process.exit(0);
}

console.error("Generated Dart bindings are out of date. Run:");
console.error("  make -C integrations/dart generate");
process.exit(1);

function formatDart(source) {
  const dir = mkdtempSync(
    resolve(repoRoot, "integrations/dart/.dart_tool/angular-ts-dart-bindings-")
  );
  const path = resolve(dir, "ng_facades.dart");

  try {
    writeFileSync(path, source);
    execFileSync("dart", ["format", path], { stdio: "ignore" });
    return readFileSync(path, "utf8");
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}
