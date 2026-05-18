#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  collectBindingMetadata,
  collectReferencedTypeNames
} from "./generate_dart_bindings.mjs";

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const overridesPath = resolve(repoRoot, "integrations/dart/tool/generator-overrides.json");
const overrides = JSON.parse(readFileSync(overridesPath, "utf8"));
const metadata = collectBindingMetadata({ repoRoot });
const referencedTypeNames = collectReferencedTypeNames({ repoRoot });
const typeNames = new Set(metadata.map((type) => type.typeName));
const memberKeys = new Set(
  metadata.flatMap((type) => type.members.map((member) => `${type.typeName}.${member.name}`))
);
const stalePatterns = [
  ...staleRenamePatterns(),
  ...staleReturnTypePatterns(),
  ...staleTypeOverridePatterns(),
  ...staleListPatterns("callableProperties", overrides.callableProperties),
  ...staleListPatterns("manual", overrides.manual),
  ...staleListPatterns("unsupported", overrides.unsupported)
];
const orderingProblems = [
  ...objectOrderingProblems("renames", overrides.renames),
  ...objectOrderingProblems("returnTypes", overrides.returnTypes),
  ...objectOrderingProblems("types", overrides.types),
  ...listOrderingProblems("callableProperties", overrides.callableProperties),
  ...listOrderingProblems("manual", overrides.manual),
  ...listOrderingProblems("unsupported", overrides.unsupported)
];

if (stalePatterns.length > 0) {
  console.error("Stale Dart member parity override entries:");

  for (const pattern of stalePatterns) {
    console.error(`- ${pattern}`);
  }

  process.exitCode = 1;
}

if (orderingProblems.length > 0) {
  console.error("Dart member parity override entries must be sorted and unique:");

  for (const problem of orderingProblems) {
    console.error(`- ${problem}`);
  }

  process.exitCode = 1;
}

if (process.exitCode !== 1) {
  const memberCount = metadata.reduce((sum, type) => sum + type.members.length, 0);
  const manualCount = countStatus("manual");
  const unsupportedCount = countStatus("unsupported");
  const generatedCount = countStatus("generated");

  console.log(
    [
      `ng namespace member parity covers ${memberCount} public members`,
      `${generatedCount} generated`,
      `${manualCount} manual`,
      `${unsupportedCount} unsupported`
    ].join("; ") + "."
  );
}

function staleRenamePatterns() {
  return Object.keys(overrides.renames ?? {})
    .filter((pattern) => !memberKeys.has(pattern))
    .map((pattern) => `renames.${pattern}`);
}

function staleReturnTypePatterns() {
  return Object.keys(overrides.returnTypes ?? {})
    .filter((pattern) => !memberKeys.has(pattern))
    .map((pattern) => `returnTypes.${pattern}`);
}

function staleTypeOverridePatterns() {
  return Object.keys(overrides.types ?? {})
    .filter((typeName) => !referencedTypeNames.has(typeName))
    .map((typeName) => `types.${typeName}`);
}

function objectOrderingProblems(sectionName, values = {}) {
  return sortedProblems(sectionName, Object.keys(values));
}

function listOrderingProblems(sectionName, values = []) {
  return sortedProblems(sectionName, values);
}

function sortedProblems(sectionName, values) {
  const problems = [];
  const sorted = [...values].sort((left, right) => left.localeCompare(right));
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);

  if (duplicates.length > 0) {
    for (const duplicate of new Set(duplicates)) {
      problems.push(`${sectionName}.${duplicate} is duplicated`);
    }
  }

  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== sorted[index]) {
      problems.push(`${sectionName} is not sorted`);
      break;
    }
  }

  return problems;
}

function staleListPatterns(sectionName, patterns = []) {
  return patterns
    .filter((pattern) => !patternMatches(pattern))
    .map((pattern) => `${sectionName}.${pattern}`);
}

function patternMatches(pattern) {
  if (pattern.endsWith(".*")) {
    return typeNames.has(pattern.slice(0, -2));
  }

  return memberKeys.has(pattern);
}

function countStatus(status) {
  return metadata.reduce(
    (sum, type) => sum + type.members.filter((member) => member.status === status).length,
    0
  );
}
