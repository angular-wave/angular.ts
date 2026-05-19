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
const overrideSections = [
  "callableProperties",
  "manual",
  "methodTypeParameters",
  "parameterTypes",
  "renames",
  "returnTypes",
  "types",
  "unsupported"
];
const allowedOverrideSections = new Set(overrideSections);
const objectOverrideSections = new Set([
  "methodTypeParameters",
  "parameterTypes",
  "renames",
  "returnTypes",
  "types"
]);
const listOverrideSections = new Set([
  "callableProperties",
  "manual",
  "unsupported"
]);
const forbiddenDartMemberNames = new Set([
  "assert",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "for",
  "if",
  "in",
  "is",
  "new",
  "null",
  "rethrow",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "var",
  "void",
  "while",
  "with"
]);
const metadata = collectBindingMetadata({ repoRoot });
const referencedTypeNames = collectReferencedTypeNames({ repoRoot });
const typeNames = new Set(metadata.map((type) => type.typeName));
const memberKeys = new Set(
  metadata.flatMap((type) => type.members.map((member) => `${type.typeName}.${member.name}`))
);
const stalePatterns = [
  ...staleRenamePatterns(),
  ...staleReturnTypePatterns(),
  ...staleMemberKeyPatterns("methodTypeParameters", overrides.methodTypeParameters),
  ...staleParameterTypeOverridePatterns(),
  ...staleTypeOverridePatterns(),
  ...staleListPatterns("callableProperties", overrides.callableProperties),
  ...staleListPatterns("manual", overrides.manual),
  ...staleListPatterns("unsupported", overrides.unsupported)
];
const orderingProblems = [
  ...objectOrderingProblems("renames", overrides.renames),
  ...objectOrderingProblems("returnTypes", overrides.returnTypes),
  ...objectOrderingProblems("methodTypeParameters", overrides.methodTypeParameters),
  ...objectOrderingProblems("parameterTypes", overrides.parameterTypes),
  ...objectOrderingProblems("types", overrides.types),
  ...explicitListProblems("manual", overrides.manual),
  ...explicitListProblems("unsupported", overrides.unsupported),
  ...listOrderingProblems("callableProperties", overrides.callableProperties),
  ...listOrderingProblems("manual", overrides.manual),
  ...listOrderingProblems("unsupported", overrides.unsupported)
];
const overrideMetadataProblems = [
  ...unknownOverrideSectionProblems(),
  ...overrideSectionTypeProblems(),
  ...overrideLeafValueProblems(),
  ...renameValueProblems(),
  ...emptyOverrideSectionProblems(),
  ...topLevelOrderingProblems()
];

if (overrideMetadataProblems.length > 0) {
  console.error("Dart generator override metadata is invalid:");

  for (const problem of overrideMetadataProblems) {
    console.error(`- ${problem}`);
  }

  process.exitCode = 1;
}

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
  return Object.keys(objectSection("renames"))
    .filter((pattern) => !memberKeys.has(pattern))
    .map((pattern) => `renames.${pattern}`);
}

function staleReturnTypePatterns() {
  return Object.keys(objectSection("returnTypes"))
    .filter((pattern) => !memberKeys.has(pattern))
    .map((pattern) => `returnTypes.${pattern}`);
}

function staleMemberKeyPatterns(sectionName, values = {}) {
  return Object.keys(objectValue(values))
    .filter((pattern) => !memberKeys.has(pattern))
    .map((pattern) => `${sectionName}.${pattern}`);
}

function staleParameterTypeOverridePatterns() {
  return Object.keys(objectSection("parameterTypes"))
    .filter((typeName) => !referencedTypeNames.has(typeName))
    .map((typeName) => `parameterTypes.${typeName}`);
}

function staleTypeOverridePatterns() {
  return Object.keys(objectSection("types"))
    .filter((typeName) => !referencedTypeNames.has(typeName))
    .map((typeName) => `types.${typeName}`);
}

function unknownOverrideSectionProblems() {
  return Object.keys(overrides)
    .filter((sectionName) => !allowedOverrideSections.has(sectionName))
    .map((sectionName) => `${sectionName} is not a supported override section`);
}

function emptyOverrideSectionProblems() {
  return Object.entries(overrides)
    .filter(([, value]) => isEmptySectionValue(value))
    .map(([sectionName]) => `${sectionName} is empty and should be removed`);
}

function overrideSectionTypeProblems() {
  return Object.entries(overrides).flatMap(([sectionName, value]) => {
    if (!allowedOverrideSections.has(sectionName)) return [];

    if (objectOverrideSections.has(sectionName) && !isPlainObject(value)) {
      return [`${sectionName} must be an object`];
    }

    if (listOverrideSections.has(sectionName) && !Array.isArray(value)) {
      return [`${sectionName} must be an array`];
    }

    return [];
  });
}

function overrideLeafValueProblems() {
  return Object.entries(overrides).flatMap(([sectionName, value]) => {
    if (objectOverrideSections.has(sectionName) && isPlainObject(value)) {
      return Object.entries(value)
        .filter(([, entryValue]) => typeof entryValue !== "string")
        .map(([entryKey]) => `${sectionName}.${entryKey} value must be a string`);
    }

    if (listOverrideSections.has(sectionName) && Array.isArray(value)) {
      return value
        .map((entryValue, index) =>
          typeof entryValue === "string"
            ? null
            : `${sectionName}[${index}] must be a string`
        )
        .filter(Boolean);
    }

    return [];
  });
}

function renameValueProblems() {
  return Object.entries(objectSection("renames")).flatMap(([memberKey, dartName]) => {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(dartName)) {
      return [`renames.${memberKey} value must be a Dart identifier`];
    }

    if (forbiddenDartMemberNames.has(dartName)) {
      return [`renames.${memberKey} value must not be a Dart reserved word`];
    }

    return [];
  });
}

function topLevelOrderingProblems() {
  return sortedProblems("top-level override sections", Object.keys(overrides));
}

function isEmptySectionValue(value) {
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;

  return false;
}

function objectSection(sectionName) {
  return objectValue(overrides[sectionName]);
}

function objectValue(value) {
  return isPlainObject(value) ? value : {};
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectOrderingProblems(sectionName, values = {}) {
  return sortedProblems(sectionName, Object.keys(objectValue(values)));
}

function listOrderingProblems(sectionName, values = []) {
  if (!isStringList(values)) return [];

  return sortedProblems(sectionName, values);
}

function explicitListProblems(sectionName, values = []) {
  if (!isStringList(values)) return [];

  return values
    .filter((value) => value.endsWith(".*"))
    .map((value) => `${sectionName}.${value} must name a concrete member`);
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
  if (!isStringList(patterns)) return [];

  return patterns
    .filter((pattern) => !patternMatches(pattern))
    .map((pattern) => `${sectionName}.${pattern}`);
}

function isStringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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
