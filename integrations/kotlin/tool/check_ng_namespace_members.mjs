#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const deferredStatuses = new Set(["alias", "planned", "review"]);
const repoRoot = path.resolve(import.meta.dirname, "../../..");
const namespacePath = path.join(repoRoot, "@types/namespace.d.ts");
const typesRoot = path.join(repoRoot, "@types");
const parityPath = path.join(repoRoot, "integrations/kotlin/NG_NAMESPACE_PARITY.md");
const overridesPath = path.join(
  repoRoot,
  "integrations/kotlin/tool/generator-overrides.json",
);

const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
const parityEntries = readParityEntries();
const metadata = collectNamespaceMetadata();
const typeNames = new Set(metadata.map((type) => type.typeName));
const memberKeys = new Set(
  metadata.flatMap((type) =>
    type.members.map((member) => `${type.typeName}.${member}`),
  ),
);

const stalePatterns = [
  ...staleObjectKeys("renames", overrides.renames, memberKeys),
  ...staleObjectKeys("returnTypes", overrides.returnTypes, memberKeys),
  ...staleObjectKeys("types", overrides.types, collectReferencedTypeNames()),
  ...staleListPatterns("callableProperties", overrides.callableProperties),
  ...staleListPatterns("manual", overrides.manual),
  ...staleListPatterns("unsupported", overrides.unsupported),
];
const orderingProblems = [
  ...objectOrderingProblems("renames", overrides.renames),
  ...objectOrderingProblems("returnTypes", overrides.returnTypes),
  ...objectOrderingProblems("types", overrides.types),
  ...listOrderingProblems("callableProperties", overrides.callableProperties),
  ...listOrderingProblems("manual", overrides.manual),
  ...listOrderingProblems("unsupported", overrides.unsupported),
];
const missingCoverage = uncoveredImplementedMembers();

if (stalePatterns.length > 0) {
  console.error("Stale Kotlin member parity override entries:");
  for (const pattern of stalePatterns) console.error(`- ${pattern}`);
}

if (orderingProblems.length > 0) {
  console.error("Kotlin member parity override entries must be sorted and unique:");
  for (const problem of orderingProblems) console.error(`- ${problem}`);
}

if (missingCoverage.length > 0) {
  console.error("Missing Kotlin member parity coverage:");
  for (const member of missingCoverage) console.error(`- ${member}`);
}

if (
  stalePatterns.length > 0 ||
  orderingProblems.length > 0 ||
  missingCoverage.length > 0
) {
  process.exit(1);
}

const memberCount = metadata.reduce((sum, type) => sum + type.members.length, 0);
const implementedTypes = parityEntries.filter(
  (entry) => !deferredStatuses.has(entry.status),
).length;

console.log(
  [
    `ng namespace member parity tracks ${memberCount} public members`,
    `${implementedTypes} implemented type decisions`,
    `${countList(overrides.manual)} manual overrides`,
    `${countList(overrides.unsupported)} unsupported overrides`,
  ].join("; ") + ".",
);

function readParityEntries() {
  const parity = fs.readFileSync(parityPath, "utf8");
  const entries = [];
  const entryPattern = /^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|$/gm;

  for (const match of parity.matchAll(entryPattern)) {
    const typeName = match[1];
    const status = match[2].trim().replace(/^`|`$/g, "");

    if (typeName === "ng type") continue;

    entries.push({ typeName, status });
  }

  return entries;
}

function collectNamespaceMetadata() {
  const program = createNamespaceProgram();
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(namespacePath);
  const metadata = [];

  visit(sourceFile);
  return metadata;

  function visit(node, inNgNamespace = false) {
    if (ts.isModuleDeclaration(node)) {
      const nextInNgNamespace =
        inNgNamespace ||
        (ts.isIdentifier(node.name) && node.name.escapedText.toString() === "ng");

      if (node.body) visit(node.body, nextInNgNamespace);
      return;
    }

    if (inNgNamespace && ts.isTypeAliasDeclaration(node)) {
      const type = checker.getTypeFromTypeNode(node.type);
      const members = new Set();

      const callSignatures = checker.getSignaturesOfType(
        type,
        ts.SignatureKind.Call,
      );

      if (callSignatures.some((signature) => isRepoTypesNode(signature.declaration))) {
        members.add("call");
      }

      for (const property of type.getProperties()) {
        const declaration = property.valueDeclaration ?? property.declarations?.[0];

        if (property.name !== "__type" && isRepoTypesNode(declaration)) {
          members.add(property.name);
        }
      }

      metadata.push({
        typeName: node.name.escapedText.toString(),
        members: [...members].sort((left, right) => left.localeCompare(right)),
      });
      return;
    }

    ts.forEachChild(node, (child) => visit(child, inNgNamespace));
  }
}

function collectReferencedTypeNames() {
  const names = new Set();
  const program = createNamespaceProgram();
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(namespacePath);

  visit(sourceFile);
  return names;

  function visit(node) {
    if (ts.isTypeReferenceNode(node)) {
      const symbol = checker.getSymbolAtLocation(node.typeName);
      if (symbol) names.add(symbol.getName());
    }

    ts.forEachChild(node, visit);
  }
}

function createNamespaceProgram() {
  return ts.createProgram([namespacePath], {
    allowJs: false,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.Latest,
  });
}

function isRepoTypesNode(node) {
  return Boolean(
    node &&
      path
        .resolve(node.getSourceFile().fileName)
        .startsWith(`${path.resolve(typesRoot)}${path.sep}`),
  );
}

function uncoveredImplementedMembers() {
  const manual = new Set(overrides.manual ?? []);
  const unsupported = new Set(overrides.unsupported ?? []);
  const missing = [];

  for (const entry of parityEntries) {
    if (deferredStatuses.has(entry.status)) continue;

    const type = metadata.find((candidate) => candidate.typeName === entry.typeName);
    if (!type) continue;

    if (entry.status === "generated") continue;
    if (patternMatches(`${entry.typeName}.*`, manual, unsupported)) continue;
    if (patternMatches(`${entry.typeName}.*`, unsupported)) continue;

    for (const member of type.members) {
      const key = `${entry.typeName}.${member}`;

      if (!patternMatches(key, manual, unsupported)) missing.push(key);
    }
  }

  return missing;
}

function staleObjectKeys(sectionName, values = {}, validKeys) {
  return Object.keys(values)
    .filter((key) => !validKeys.has(key))
    .map((key) => `${sectionName}.${key}`);
}

function staleListPatterns(sectionName, patterns = []) {
  return patterns
    .filter((pattern) => !patternMatchesPattern(pattern))
    .map((pattern) => `${sectionName}.${pattern}`);
}

function patternMatchesPattern(pattern) {
  if (pattern.endsWith(".*")) return typeNames.has(pattern.slice(0, -2));
  return memberKeys.has(pattern);
}

function patternMatches(key, ...sets) {
  const wildcard = `${key.split(".")[0]}.*`;
  return sets.some((set) => set.has(key) || set.has(wildcard));
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

  for (const duplicate of new Set(duplicates)) {
    problems.push(`${sectionName}.${duplicate} is duplicated`);
  }

  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== sorted[index]) {
      problems.push(`${sectionName} is not sorted`);
      break;
    }
  }

  return problems;
}

function countList(value = []) {
  return value.length;
}
