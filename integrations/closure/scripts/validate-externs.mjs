import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const integrationRoot = resolve(dirname(__filename), "..");
const repoRoot = resolve(integrationRoot, "../..");
const namespacePath = resolve(repoRoot, "src/namespace.ts");
const externsPath = resolve(integrationRoot, "externs/angular-ts.externs.js");
const generatorPath = resolve(integrationRoot, "scripts/generate-externs.mjs");

const generatedExterns = spawnSync("node", [generatorPath, "--check"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (generatedExterns.status !== 0) {
  process.exit(generatedExterns.status || 1);
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function findNamespaceBody(source) {
  const marker = "export namespace ng";
  const markerIndex = source.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Could not find '${marker}' in ${namespacePath}`);
  }

  const openIndex = source.indexOf("{", markerIndex);

  if (openIndex === -1) {
    throw new Error(`Could not find namespace body in ${namespacePath}`);
  }

  let depth = 0;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }

  throw new Error(`Could not parse namespace body in ${namespacePath}`);
}

function collectPublicNamespaceTypes(source) {
  const body = findNamespaceBody(source);
  const names = new Set();
  const typePattern = /\bexport\s+type\s+([A-Za-z_$][\w$]*)\b/g;
  let match;

  while ((match = typePattern.exec(body)) !== null) {
    names.add(match[1]);
  }

  return names;
}

function collectGenericPublicNamespaceTypes(source) {
  const body = findNamespaceBody(source);
  const names = new Set();
  const typePattern = /\bexport\s+type\s+([A-Za-z_$][\w$]*)\s*</g;
  let match;

  while ((match = typePattern.exec(body)) !== null) {
    names.add(match[1]);
  }

  return names;
}

function collectExternNamespaceTypes(source) {
  const names = new Set();
  const externPattern = /\bng\.([A-Za-z_$][\w$]*)(?=\s*(?:[;=]|$))/g;
  let match;

  while ((match = externPattern.exec(source)) !== null) {
    names.add(match[1]);
  }

  return names;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findStructuralExternJsDoc(source, name) {
  const escapedName = escapeRegExp(name);
  const pattern = new RegExp(
    `(/\\*\\*(?:(?!/\\*\\*)[\\s\\S])*?@(record|constructor|interface)[\\s\\S]*?\\*/)\\s*ng\\.${escapedName}\\s*=\\s*function\\b`,
  );
  const match = source.match(pattern);

  return match ? match[1] : "";
}

function findExternJsDoc(source, name) {
  const escapedName = escapeRegExp(name);
  const declarations = [
    new RegExp(
      `(/\\*\\*(?:(?!/\\*\\*)[\\s\\S])*?\\*/)\\s*ng\\.${escapedName}\\s*(?:[;=])`,
    ),
    new RegExp(
      `(/\\*\\*(?:(?!/\\*\\*)[\\s\\S])*?\\*/)\\s*ng\\.${escapedName}\\.prototype\\b`,
    ),
  ];

  for (const pattern of declarations) {
    const match = source.match(pattern);

    if (match) return match[1];
  }

  return "";
}

function hasTemplateDoc(jsDoc) {
  return /@template\b/.test(jsDoc);
}

function hasUsefulDescription(jsDoc) {
  const description = jsDoc
    .replace(/^\/\*\*|\*\/$/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line && !line.startsWith("@"))
    .join(" ");

  return (
    description.length >= 24 &&
    !description.includes("Closure mirror") &&
    !description.includes("TypeScript type")
  );
}

function hasStructuralExtern(source, name) {
  const escapedName = escapeRegExp(name);
  const declarations = [
    new RegExp(
      `/\\*\\*(?:(?!/\\*\\*)[\\s\\S])*?@(record|constructor|interface)[\\s\\S]*?\\*/\\s*ng\\.${escapedName}\\s*=\\s*function\\b`,
    ),
    new RegExp(
      `/\\*\\*(?:(?!/\\*\\*)[\\s\\S])*?@typedef\\s*\\{(?!\\*)[^}]+\\}[\\s\\S]*?\\*/\\s*ng\\.${escapedName}\\s*;`,
    ),
  ];

  return declarations.some((pattern) => pattern.test(source));
}

function sortedDifference(left, right) {
  return [...left].filter((name) => !right.has(name)).sort();
}

const publicTypes = collectPublicNamespaceTypes(readText(namespacePath));
const genericPublicTypes = collectGenericPublicNamespaceTypes(readText(namespacePath));
const externsSource = readText(externsPath);
const externTypes = collectExternNamespaceTypes(externsSource);
const missing = sortedDifference(publicTypes, externTypes);
const stale = sortedDifference(externTypes, publicTypes);
const missingJsDoc = [...publicTypes]
  .filter(
    (name) =>
      externTypes.has(name) &&
      !hasUsefulDescription(findExternJsDoc(externsSource, name)),
  )
  .sort();
const nonStructural = [...publicTypes]
  .filter((name) => externTypes.has(name) && !hasStructuralExtern(externsSource, name))
  .sort();
const genericStructuralMissingTemplate = [...genericPublicTypes]
  .filter((name) => {
    const jsDoc = findStructuralExternJsDoc(externsSource, name);

    return jsDoc && !hasTemplateDoc(jsDoc);
  })
  .sort();
const wildcardTypedefs = [...externsSource.matchAll(/@typedef\s*\{\*\}/g)];
const selfReferentialTypedefs = [
  ...externsSource.matchAll(
    /@typedef\s*\{\s*!?ng\.([A-Za-z_$][\w$]*)\s*\}[\s\S]*?ng\.\1\s*;/g,
  ),
].map((match) => match[1]);

if (
  missing.length > 0 ||
  stale.length > 0 ||
  missingJsDoc.length > 0 ||
  nonStructural.length > 0 ||
  genericStructuralMissingTemplate.length > 0 ||
  wildcardTypedefs.length > 0 ||
  selfReferentialTypedefs.length > 0
) {
  if (missing.length > 0) {
    console.error("Missing AngularTS Closure extern types:");
    missing.forEach((name) => console.error(`  - ${name}`));
  }

  if (stale.length > 0) {
    console.error("Extern types not present in the public ng namespace:");
    stale.forEach((name) => console.error(`  - ${name}`));
  }

  if (missingJsDoc.length > 0) {
    console.error("AngularTS Closure extern types missing useful JSDoc:");
    missingJsDoc.forEach((name) => console.error(`  - ${name}`));
  }

  if (nonStructural.length > 0) {
    console.error("AngularTS Closure extern types missing structural contracts:");
    nonStructural.forEach((name) => console.error(`  - ${name}`));
  }

  if (genericStructuralMissingTemplate.length > 0) {
    console.error("Generic structural Closure extern types missing @template:");
    genericStructuralMissingTemplate.forEach((name) => console.error(`  - ${name}`));
  }

  if (wildcardTypedefs.length > 0) {
    console.error("Wildcard Closure typedefs are not allowed in AngularTS externs.");
  }

  if (selfReferentialTypedefs.length > 0) {
    console.error("Self-referential Closure typedefs are not allowed:");
    selfReferentialTypedefs.forEach((name) => console.error(`  - ${name}`));
  }

  process.exit(1);
}

console.log(`Validated ${publicTypes.size} public ng namespace Closure extern types.`);
