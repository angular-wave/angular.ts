#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const libSrc = resolve(repoRoot, "integrations/dart/lib/src");
const generatedPath = resolve(libSrc, "generated/ng_facades.dart");
const generatedSource = readFileSync(generatedPath, "utf8");
const generatedTypes = new Set(
  [...generatedSource.matchAll(/base class GeneratedNg([A-Za-z0-9_]+)/g)].map(
    (match) => match[1]
  )
);
const violations = [];

for (const file of dartFiles(libSrc)) {
  if (file === generatedPath) continue;

  const source = readFileSync(file, "utf8");

  for (const match of source.matchAll(
    /(?:final|base|sealed|abstract)?\s*class\s+([A-Za-z0-9_]+)\s+extends\s+AngularTsJsFacade/g
  )) {
    const className = match[1];

    if (generatedTypes.has(className)) {
      violations.push(`${relative(repoRoot, file)}: ${className}`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    "Dart facades with generated bases must extend the generated base:"
  );

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  process.exit(1);
}

console.log("All Dart facades use generated bases when available.");

function dartFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return dartFiles(path);
    return path.endsWith(".dart") ? [path] : [];
  });
}
