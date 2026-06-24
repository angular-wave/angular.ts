#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const validStatuses = new Set(["manual", "generated", "planned", "unsupported"]);
const root = path.resolve(import.meta.dirname, "../../..");
const namespacePath = path.join(root, "@types/namespace.d.ts");
const parityPath = path.join(root, "integrations/scala/NG_NAMESPACE_PARITY.md");

const namespace = fs.readFileSync(namespacePath, "utf8");
const parity = fs.readFileSync(parityPath, "utf8");
const sourceTypes = extractNamespaceTypes(namespace);
const parityEntries = extractParityEntries(parity);
const parityTypes = parityEntries.map((entry) => entry.typeName);

const missing = sourceTypes.filter((typeName) => !parityTypes.includes(typeName));
const stale = parityTypes.filter((typeName) => !sourceTypes.includes(typeName));
const duplicates = parityTypes.filter(
  (typeName, index) => parityTypes.indexOf(typeName) !== index,
);
const invalidStatuses = parityEntries.filter(
  (entry) => !validStatuses.has(entry.status),
);

if (missing.length > 0) {
  console.error("Missing Scala parity entries:");
  for (const typeName of missing) console.error(`- ${typeName}`);
}

if (stale.length > 0) {
  console.error("Stale Scala parity entries:");
  for (const typeName of stale) console.error(`- ${typeName}`);
}

if (duplicates.length > 0) {
  console.error("Duplicated Scala parity entries:");
  for (const typeName of new Set(duplicates)) console.error(`- ${typeName}`);
}

if (invalidStatuses.length > 0) {
  console.error("Invalid Scala parity statuses:");
  for (const entry of invalidStatuses) {
    console.error(`- ${entry.typeName}: ${entry.status}`);
  }
}

if (
  missing.length > 0 ||
  stale.length > 0 ||
  duplicates.length > 0 ||
  invalidStatuses.length > 0
) {
  process.exit(1);
}

console.log(`Scala namespace parity covers ${sourceTypes.length} ng types.`);

function extractNamespaceTypes(sourceText) {
  const sourceFile = ts.createSourceFile(
    namespacePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const types = [];

  function visit(node, inNgNamespace = false) {
    if (ts.isModuleDeclaration(node)) {
      const nextInNgNamespace =
        inNgNamespace ||
        (ts.isIdentifier(node.name) && node.name.escapedText.toString() === "ng");

      if (node.body) visit(node.body, nextInNgNamespace);
      return;
    }

    if (inNgNamespace && ts.isTypeAliasDeclaration(node)) {
      types.push(node.name.escapedText.toString());
      return;
    }

    ts.forEachChild(node, (child) => visit(child, inNgNamespace));
  }

  visit(sourceFile);
  return types;
}

function extractParityEntries(parityText) {
  const entries = [];
  const entryPattern = /^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|$/gm;

  for (const match of parityText.matchAll(entryPattern)) {
    const typeName = match[1];
    const status = match[2].trim().replace(/^`|`$/g, "");

    if (typeName === "ng type") continue;

    entries.push({ typeName, status });
  }

  return entries;
}
