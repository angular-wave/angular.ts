import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../../..");
const namespacePath = path.join(root, "@types/namespace.d.ts");
const parityPath = path.join(root, "integrations/gleam/NG_NAMESPACE_PARITY.md");
const gleamNamespacePath = path.join(
  root,
  "integrations/gleam/src/angular_ts/namespace.gleam",
);

const namespace = fs.readFileSync(namespacePath, "utf8");
const parity = fs.readFileSync(parityPath, "utf8");
const gleamNamespace = fs.readFileSync(gleamNamespacePath, "utf8");

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
      const name = node.name;
      const nextInNgNamespace =
        inNgNamespace ||
        (ts.isIdentifier(name) && name.escapedText.toString() === "ng");

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

const sourceTypes = extractNamespaceTypes(namespace);

const parityTypes = [...parity.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(
  (match) => match[1],
);

const gleamTypes = [...gleamNamespace.matchAll(/^pub type\s+(\w+)/gm)].map(
  (match) => match[1],
);

const missing = sourceTypes.filter((type) => !parityTypes.includes(type));
const stale = parityTypes.filter((type) => !sourceTypes.includes(type));
const missingGleam = sourceTypes.filter((type) => !gleamTypes.includes(type));
const staleGleam = gleamTypes.filter((type) => !sourceTypes.includes(type));

if (missing.length > 0) {
  console.error("Missing Gleam parity entries:");
  for (const type of missing) console.error(`- ${type}`);
}

if (stale.length > 0) {
  console.error("Stale Gleam parity entries:");
  for (const type of stale) console.error(`- ${type}`);
}

if (missingGleam.length > 0) {
  console.error("Missing generated Gleam namespace types:");
  for (const type of missingGleam) console.error(`- ${type}`);
}

if (staleGleam.length > 0) {
  console.error("Stale generated Gleam namespace types:");
  for (const type of staleGleam) console.error(`- ${type}`);
}

if (
  missing.length > 0 ||
  stale.length > 0 ||
  missingGleam.length > 0 ||
  staleGleam.length > 0
) {
  process.exit(1);
}
