import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const sourceRoots = [
  path.join(projectRoot, "src"),
  path.join(projectRoot, "integrations"),
  path.join(projectRoot, "tools"),
];

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "bin",
  "obj",
  "build",
  ".build",
  "_framework",
  "vendor",
  ".cache",
  "coverage",
  ".turbo",
  "out",
  "target",
]);

const TS_SCRIPT_EXTS = new Map([
  [".ts", ts.ScriptKind.TS],
  [".tsx", ts.ScriptKind.TSX],
  [".js", ts.ScriptKind.JS],
  [".jsx", ts.ScriptKind.JSX],
  [".mjs", ts.ScriptKind.JS],
  [".cjs", ts.ScriptKind.JS],
  [".mts", ts.ScriptKind.TS],
  [".cts", ts.ScriptKind.TS],
]);

const REGEX_CHECK_EXTS = new Set([
  ".java",
  ".kt",
  ".kts",
  ".dart",
  ".gleam",
  ".scala",
  ".rs",
  ".go",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".cc",
  ".cxx",
  ".zig",
  ".swift",
]);

function listSourceFiles(rootDir) {
  const files = [];
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);

      if (
        entry.isDirectory() &&
        (SKIP_DIRS.has(entry.name) || entry.name.startsWith("."))
      ) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (extension === ".d.ts") continue;
      if (
        entry.name.endsWith(".spec.ts") ||
        entry.name.endsWith(".spec.js") ||
        entry.name.endsWith(".test.ts") ||
        entry.name.endsWith(".test.js")
      ) {
        continue;
      }

      if (
        !TS_SCRIPT_EXTS.has(extension) &&
        !REGEX_CHECK_EXTS.has(extension)
      )
        continue;

      files.push(absolutePath);
    }
  }

  walk(rootDir);
  return files;
}

function extractLiteralValue(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function isUnderscoreKey(value) {
  return typeof value === "string" && /^_/.test(value);
}

function hasNodeWithTemplateSubstitution(node) {
  return ts.isTemplateLiteral(node) && node.templateSpans.length > 0;
}

function getStringLiteralFromCallArg(node) {
  if (!node) return null;
  if (hasNodeWithTemplateSubstitution(node)) return null;
  return extractLiteralValue(node);
}

function isReflectCallExpression(node) {
  if (!ts.isCallExpression(node)) return false;

  const callee = node.expression;
  if (ts.isPropertyAccessExpression(callee)) {
    const object = callee.expression;
    const method = callee.name.text;
    if (object && ts.isIdentifier(object) && object.text === "Reflect") {
      return method === "get" || method === "set" || method === "has";
    }

    // Object.prototype.hasOwnProperty.call(...)
    if (
      method === "call" &&
      ts.isPropertyAccessExpression(object) &&
      ts.isPropertyAccessExpression(object.expression) &&
      ts.isIdentifier(object.expression.expression) &&
      object.expression.expression.text === "Object" &&
      object.expression.name.text === "prototype" &&
      object.name.text === "hasOwnProperty"
    ) {
      return true;
    }
  }

  return false;
}

function isHasOwnLikeCallExpression(node) {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (!ts.isIdentifier(callee)) return false;
  const name = callee.text;
  return name === "hasOwn";
}

function isObjectHasOwnCallExpression(node) {
  if (!ts.isCallExpression(node)) return false;

  const callee = node.expression;
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "Object" &&
    callee.name.text === "hasOwn"
  );
}

function positionFromOffset(sourceText, offset) {
  const chunk = sourceText.slice(0, offset);
  const line = chunk.split("\n").length;
  const lastLineBreak = chunk.lastIndexOf("\n");
  const column = lastLineBreak === -1 ? chunk.length + 1 : offset - lastLineBreak;

  return {
    line,
    column,
  };
}

function recordRegexMatch(
  findings,
  fileName,
  sourceText,
  matchIndex,
  matchLength,
  key,
) {
  if (!isUnderscoreKey(key)) return;

  const { line, column } = positionFromOffset(sourceText, matchIndex);
  const preview = sourceText.slice(matchIndex, matchIndex + matchLength);

  if (!findings.has(key)) findings.set(key, []);
  findings.get(key).push({
    file: path.relative(projectRoot, fileName),
    line,
    column,
    preview,
  });
}

function collectKeysFromTextFileUsingRegex(
  fileName,
  sourceText,
  findings,
) {
  const bracketAccess = /\b(?:\w|\)|\]|\}|\$)\s*\[\s*(['"])(_[^'"]+)\1\s*\]/g;
  const inOperator = /\b(['"])(_[^'"]+)\1\s+in\s+[^;\n)]+/g;
  const reflectCalls = /\bReflect\.(?:get|set|has)\(\s*[^,\s)]+,\s*(['"])(_[^'"]+)\1/g;
  const objectHasOwn = /\bObject\.hasOwn\(\s*[^,\s)]+,\s*(['"])(_[^'"]+)\1/g;
  const objectHasOwnPropertyCall =
    /\bObject\.prototype\.hasOwnProperty\.call\(\s*[^,\s)]+,\s*(['"])(_[^'"]+)\1/g;
  const hasOwnCalls = /\bhasOwn\(\s*[^,\s)]+,\s*(['"])(_[^'"]+)\1/g;
  const dartInteropProperties = /\b(?:[A-Za-z_$][A-Za-z0-9_$]*\.)?(?:getProperty|setProperty|deleteProperty|getPropertyAs|setPropertyAs|deletePropertyAs)\(\s*r?(["'])(_[^"']+)\1(?:\.toJS)?/g;
  const dartInteropCallMethodFirstArg = /\b(?:[A-Za-z_$][A-Za-z0-9_$]*\.)?callMethod(?:VarArgs)?\(\s*r?(["'])(_[^"']+)\1(?:\.toJS)?/g;
  const dartInteropCallMethodSecondArg = /\b(?:[A-Za-z_$][A-Za-z0-9_$]*\.)?callMethod(?:VarArgs)?\(\s*[^,\n]+\s*,\s*r?(["'])(_[^"']+)\1(?:\.toJS)?/g;
  const dartContainsKey = /\b(?:[A-Za-z_$][A-Za-z0-9_$]*\.)?containsKey\(\s*r?(["'])(_[^"']+)\1/g;
  const gleamPropertySetters = /\b(?:[A-Za-z_$][A-Za-z0-9_$]*\.)?(?:set_property|set_string|set_bool)\(\s*[^,\n)]+,\s*(["'])(_[^"']+)\1/g;
  const gleamCallMethods = /\b(?:[A-Za-z_$][A-Za-z0-9_$]*\.)?call_method[0-9]?\(\s*[^,\n)]+\s*,\s*(["'])(_[^"']+)\1/g;

  const checks = [
    bracketAccess,
    inOperator,
    reflectCalls,
    objectHasOwn,
    objectHasOwnPropertyCall,
    hasOwnCalls,
    dartInteropProperties,
    dartInteropCallMethodFirstArg,
    dartInteropCallMethodSecondArg,
    dartContainsKey,
    gleamPropertySetters,
    gleamCallMethods,
  ];

  for (const regex of checks) {
    let match;
    while ((match = regex.exec(sourceText)) !== null) {
      recordRegexMatch(
        findings,
        fileName,
        sourceText,
        match.index,
        match[0].length,
        match[2] ?? match[1],
      );
    }
  }
}

function recordKey(findings, fileName, node, key) {
  if (!isUnderscoreKey(key)) return;
  const sourceFile = node.getSourceFile();
  const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const line = pos.line + 1;
  const column = pos.character + 1;

  if (!findings.has(key)) findings.set(key, []);
  findings.get(key).push({
    file: path.relative(projectRoot, fileName),
    line,
    column,
    preview: node.getText(sourceFile),
  });
}

function collectKeysFromSourceFile(fileName, findings) {
  const sourceText = fs.readFileSync(fileName, "utf-8");
  const extension = path.extname(fileName).toLowerCase();
  const scriptKind = TS_SCRIPT_EXTS.get(extension);

  if (!scriptKind) {
    collectKeysFromTextFileUsingRegex(fileName, sourceText, findings);
    return;
  }

  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.ESNext,
    true,
    scriptKind,
  );

  const visit = (node) => {
    if (ts.isElementAccessExpression(node)) {
      const keyLiteral = getStringLiteralFromCallArg(node.argumentExpression);
      if (keyLiteral !== null) {
        recordKey(findings, fileName, node.argumentExpression, keyLiteral);
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.InKeyword
    ) {
      const key = getStringLiteralFromCallArg(node.left);
      if (key !== null) {
        recordKey(findings, fileName, node.left, key);
      }
    } else if (isReflectCallExpression(node)) {
      const keyArg = getStringLiteralFromCallArg(node.arguments[1]);
      if (keyArg !== null) {
        recordKey(findings, fileName, node.arguments[1], keyArg);
      }
    } else if (isHasOwnLikeCallExpression(node)) {
      const keyArg = getStringLiteralFromCallArg(node.arguments[1]);
      if (keyArg !== null) {
        recordKey(findings, fileName, node.arguments[1], keyArg);
      }
    } else if (isObjectHasOwnCallExpression(node)) {
      const keyArg = getStringLiteralFromCallArg(node.arguments[1]);
      if (keyArg !== null) {
        recordKey(findings, fileName, node.arguments[1], keyArg);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

function main() {
  const files = sourceRoots.flatMap((root) =>
    fs.existsSync(root) ? listSourceFiles(root) : [],
  );
  const findings = new Map();

  for (const fileName of files) {
    collectKeysFromSourceFile(fileName, findings);
  }

  if (findings.size === 0) {
    return;
  }

  const findingsList = Array.from(findings.entries()).map(
    ([key, locations]) => ({
      key,
      locations,
    }),
  );

  const fileCount = findingsList.reduce(
    (sum, item) => sum + item.locations.length,
    0,
  );
  const plural = fileCount === 1 ? "occurrence" : "occurrences";

  console.error(
    `[underscore-prop-check] Found ${fileCount} ${plural} of underscore-prefixed runtime string keys`,
  );
  for (const { key, locations } of findingsList) {
    for (const location of locations) {
      console.error(
        `  - ${location.file}:${location.line}:${location.column} -> ${key}`,
      );
    }
    console.error();
  }

  console.error(
    "String-based property access on underscore-prefixed keys is disallowed. This is unsafe under property mangling.",
  );
  console.error(
    "Remove the string access or refactor to direct property access.",
  );

  process.exitCode = 1;
}

main();
