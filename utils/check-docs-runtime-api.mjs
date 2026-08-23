import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const docsRoot = join("docs", "content");
const examplesRoot = join("docs", "static", "examples");
const sourceRoot = "src";
const failures = [];
const sourceFiles = walkFiles(sourceRoot, ".ts").filter(
  (file) => !/\.(?:spec|test)\.ts$/u.test(file),
);
const sourceText = sourceFiles
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const supportedDirectives = collectSupportedDirectives(sourceText);
supportedDirectives.add("ng-app");
for (const name of collectEventDirectives(
  join(sourceRoot, "directive", "events", "events.ts"),
)) {
  supportedDirectives.add(name);
}
const packageExports = collectPackageExports(join(sourceRoot, "index.ts"));
const dynamicDirectivePrefixes = [
  "ng-document-",
  "ng-observe-",
  "ng-prop-",
  "ng-window-",
];
const runtimeNames = new Set([
  "ng-click-non-native",
  "ng-messages-live",
  "ng-router",
  "ng-template",
  "ng-window",
]);
const runtimeClassNames = [
  /^ng-(?:enter|leave|move)(?:-active|-stagger)?$/u,
  /^ng-hide-(?:add|remove)(?:-active)?$/u,
  /^ng-(?:dirty|invalid|pending|pristine|submitted|touched|untouched|valid)$/u,
  /^ng-(?:anchor|animate-shim|hide-animate)$/u,
];
const forbiddenSyntax = [
  { pattern: /\btrack\s+by\b/giu, label: "removed ng-repeat track-by syntax" },
  {
    pattern: /\bng-repeat-(?:start|end)\b/giu,
    label: "unsupported multi-element repeat syntax",
  },
  { pattern: /\bng-keypress\b/giu, label: "unsupported keypress directive" },
  {
    pattern: /\bng-on(?:-[a-z][a-z0-9-]*)?\b/giu,
    label: "unsupported ng-on directive",
  },
];
const forbiddenCodeSyntax = [
  { pattern: /\$animateJs\b/gu, label: "removed $animateJs service" },
  { pattern: /\$q\b/gu, label: "removed $q service" },
  {
    pattern: /\.\$(?:observe|persist|subscribe)\b/gu,
    label: "removed dollar-prefixed method",
  },
];
let pageCount = 0;
let htmlExampleCount = 0;
let packageImportCount = 0;
let externalExampleCount = 0;

for (const file of walkFiles(docsRoot, ".md")) {
  pageCount++;
  const text = readFileSync(file, "utf8");
  const relativePath = relative(".", file);
  const lines = text.split(/\r?\n/gu);

  for (const { pattern, label } of forbiddenSyntax) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      failures.push(`${relativePath}:${lineAt(text, match.index)}: ${label}`);
    }
  }

  for (const match of text.matchAll(/\bng-[a-z][a-z0-9-]*/gu)) {
    const name = match[0];
    if (
      supportedDirectives.has(name) ||
      runtimeNames.has(name) ||
      dynamicDirectivePrefixes.some((prefix) => name.startsWith(prefix)) ||
      runtimeClassNames.some((pattern) => pattern.test(name))
    ) {
      continue;
    }
    failures.push(
      `${relativePath}:${lineAt(text, match.index)}: '${name}' is not shipped by AngularTS`,
    );
  }

  for (const language of ["js", "ts"]) {
    for (const block of codeBlocks(lines, language)) {
      for (const { pattern, label } of forbiddenCodeSyntax) {
        pattern.lastIndex = 0;
        for (const match of block.text.matchAll(pattern)) {
          failures.push(
            `${relativePath}:${block.line + lineAt(block.text, match.index) - 1}: ${label}`,
          );
        }
      }
    }
  }

  for (const block of codeBlocks(lines, "html")) {
    htmlExampleCount++;
    for (const tag of block.text.matchAll(/<[^!][^>]*>/gu)) {
      const tagText = tag[0];
      const tagLine = block.line + lineAt(block.text, tag.index) - 1;
      const elementName = tagText.match(/^<\/?\s*(ng-[a-z][a-z0-9-]*)/u)?.[1];

      if (elementName) validateDirective(elementName, relativePath, tagLine);

      for (const attribute of tagText.matchAll(
        /(?:^|\s)(ng-[a-z][a-z0-9-]*)(?=\s|=|\/?>)/gu,
      )) {
        validateDirective(attribute[1], relativePath, tagLine);
      }
    }
  }

  for (const declaration of text.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*["']@angular-wave\/angular\.ts["']/gsu,
  )) {
    packageImportCount++;
    for (const imported of declaration[1].split(",")) {
      const name = imported
        .trim()
        .replace(/^type\s+/u, "")
        .split(/\s+as\s+/u)[0];

      if (name && !packageExports.has(name)) {
        failures.push(
          `${relativePath}:${lineAt(text, declaration.index)}: package entry point does not export '${name}'`,
        );
      }
    }
  }
}

for (const file of walkFiles(examplesRoot, ".html")) {
  externalExampleCount++;
  const text = readFileSync(file, "utf8");
  const localDirectives = new Set(
    [...text.matchAll(/\.directive\(\s*["']([^"']+)["']/gu)].map((match) =>
      toKebab(match[1]),
    ),
  );
  const relativePath = relative(".", file);

  for (const { pattern, label } of forbiddenSyntax) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      failures.push(`${relativePath}:${lineAt(text, match.index)}: ${label}`);
    }
  }

  for (const match of text.matchAll(/\bng-[a-z][a-z0-9-]*/gu)) {
    if (!localDirectives.has(match[0]) && !isRuntimeName(match[0])) {
      failures.push(
        `${relativePath}:${lineAt(text, match.index)}: '${match[0]}' is not shipped by AngularTS`,
      );
    }
  }

  for (const { pattern, label } of forbiddenCodeSyntax) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      failures.push(`${relativePath}:${lineAt(text, match.index)}: ${label}`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "Documentation must match the shipped runtime and package API.",
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `${pageCount} documentation pages and ${externalExampleCount} executable examples align across ${htmlExampleCount} HTML snippets and ${packageImportCount} package imports.`,
);

function validateDirective(name, file, line) {
  if (isRuntimeName(name)) return;

  failures.push(`${file}:${line}: '${name}' is not shipped by AngularTS`);
}

function isRuntimeName(name) {
  return (
    supportedDirectives.has(name) ||
    runtimeNames.has(name) ||
    dynamicDirectivePrefixes.some((prefix) => name.startsWith(prefix)) ||
    runtimeClassNames.some((pattern) => pattern.test(name))
  );
}

function collectEventDirectives(file) {
  const text = readFileSync(file, "utf8");
  const list = text.match(/const EVENT_NAMES = \[([\s\S]*?)\] as const;/u)?.[1];
  if (!list) return [];
  return [...list.matchAll(/["']([a-z][a-z0-9]*)["']/gu)].map(
    (match) => `ng-${match[1]}`,
  );
}

function collectSupportedDirectives(text) {
  const names = new Set();

  for (const match of text.matchAll(/\bng[A-Z][A-Za-z0-9]*/gu)) {
    const identifier = match[0];
    names.add(toKebab(identifier));
    if (identifier.endsWith("Directive")) {
      names.add(toKebab(identifier.slice(0, -"Directive".length)));
    }
  }

  for (const match of text.matchAll(/\.directive\(\s*["']([^"']+)["']/gu)) {
    names.add(toKebab(match[1]));
  }

  return names;
}

function collectPackageExports(file) {
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const names = new Set();

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (!ts.isNamedExports(statement.exportClause)) continue;
      for (const element of statement.exportClause.elements) {
        names.add(element.name.text);
      }
      continue;
    }

    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!exported) continue;

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    } else if ("name" in statement && statement.name) {
      if (ts.isIdentifier(statement.name)) names.add(statement.name.text);
    }
  }

  return names;
}

function* codeBlocks(lines, language) {
  let block;

  for (const [index, line] of lines.entries()) {
    const fence = line.match(/^```([^\s`]*)\s*$/u);
    if (!fence) {
      if (block) block.lines.push(line);
      continue;
    }

    if (!block) {
      block = { language: fence[1], line: index + 2, lines: [] };
      continue;
    }

    if (block.language === language) {
      yield { line: block.line, text: block.lines.join("\n") };
    }
    block = undefined;
  }
}

function lineAt(text, index = 0) {
  return text.slice(0, index).split("\n").length;
}

function toKebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/gu, "$1-$2")
    .toLowerCase();
}

function walkFiles(root, extension) {
  if (!existsSync(root)) return [];

  return readdirSync(root).flatMap((entry) => {
    const file = join(root, entry);
    return statSync(file).isDirectory()
      ? walkFiles(file, extension)
      : file.endsWith(extension)
        ? [file]
        : [];
  });
}
