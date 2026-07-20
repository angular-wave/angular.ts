#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const kotlinRoot = path.join(repoRoot, "integrations/kotlin");
const mainRoot = path.join(kotlinRoot, "src/jsMain/kotlin/angular/ts");
const generatedPath = path.join(mainRoot, "generated/NgFacades.kt");

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath, predicate);
    return entry.isFile() && predicate(fullPath) ? [fullPath] : [];
  });
}

function relative(file) {
  return path.relative(repoRoot, file);
}

const failures = [];
const generated = fs.readFileSync(generatedPath, "utf8");

if (!/^package angular\.ts\.generated$/m.test(generated)) {
  failures.push("Generated Kotlin facades must live in package angular.ts.generated.");
}

for (const file of walk(mainRoot, (candidate) => candidate.endsWith(".kt"))) {
  const source = fs.readFileSync(file, "utf8");
  const isGeneratedFile = path.resolve(file) === path.resolve(generatedPath);

  if (!isGeneratedFile && /^package angular\.ts\.generated$/m.test(source)) {
    failures.push(`${relative(file)} must not declare package angular.ts.generated.`);
  }

  if (isGeneratedFile) continue;

  for (const [index, line] of source.split("\n").entries()) {
    if (line.startsWith("import angular.ts.generated.") && !/\sas\s+Raw[A-Za-z0-9_]+$/.test(line)) {
      failures.push(
        `${relative(file)}:${index + 1} generated imports must be aliased as Raw*.`,
      );
    }

    if (/^\s*public\b/.test(line) && /\bRaw[A-Za-z0-9_]*\b/.test(line)) {
      failures.push(
        `${relative(file)}:${index + 1} public angular.ts declarations must not expose Raw* generated facade types.`,
      );
    }
  }
}

for (const file of walk(path.join(kotlinRoot, "examples"), (candidate) => candidate.endsWith(".kt"))) {
  const source = fs.readFileSync(file, "utf8");

  if (source.includes("angular.ts.generated")) {
    failures.push(`${relative(file)} must use the handwritten angular.ts API, not generated raw facades.`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log("Kotlin package boundaries keep generated facades isolated from ergonomic APIs and examples.");
