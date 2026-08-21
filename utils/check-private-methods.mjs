import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const roots = ["src", "integrations", "tools"];
const skippedDirectories = new Set([
  ".build",
  ".cache",
  ".vscode-test",
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "out",
  "target",
  "vendor",
]);
const failures = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;

  for (const file of sourceFiles(root)) checkFile(file);
}

if (failures.length > 0) {
  console.error(
    "Private methods must use an underscore prefix and @internal; legacy TypeDoc visibility annotations are forbidden.",
  );

  for (const failure of failures) console.error(`- ${failure}`);

  process.exitCode = 1;
} else {
  console.log(
    "Private method check passed; internal methods use underscore prefixes and @internal without legacy visibility annotations.",
  );
}

function* sourceFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || skippedDirectories.has(entry.name)) {
      continue;
    }

    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* sourceFiles(file);
      continue;
    }

    if (
      entry.isFile() &&
      /\.(?:cts|mts|tsx?)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      yield file;
    }
  }
}

function checkFile(file) {
  const sourceText = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  checkLegacyVisibilityAnnotations(file, sourceText, sourceFile);
  visit(sourceFile);

  function visit(node) {
    if (isMethodLike(node) && node.name) checkMethod(node);
    ts.forEachChild(node, visit);
  }

  function checkMethod(node) {
    if (ts.isPrivateIdentifier(node.name)) {
      report(node, node.name.text, "ECMAScript private method must use _name");
      return;
    }

    if (!ts.isIdentifier(node.name) && !ts.isStringLiteralLike(node.name)) {
      return;
    }

    const name = node.name.text;
    const modifiers = ts.getModifiers(node) ?? [];
    const hasPrivateVisibility = modifiers.some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.PrivateKeyword ||
        modifier.kind === ts.SyntaxKind.ProtectedKeyword,
    );

    if (hasPrivateVisibility && !name.startsWith("_")) {
      report(node, name, "private or protected method must use _name");
    }

    if (
      name.startsWith("_") &&
      !ts.getJSDocTags(node).some((tag) => tag.tagName.text === "internal")
    ) {
      report(node, name, "underscore-prefixed method must have @internal");
    }
  }

  function report(node, name, message) {
    const position = sourceFile.getLineAndCharacterOfPosition(
      node.name.getStart(sourceFile),
    );

    failures.push(
      `${file}:${String(position.line + 1)}:${String(position.character + 1)} ${name}: ${message}`,
    );
  }
}

function checkLegacyVisibilityAnnotations(file, sourceText, sourceFile) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    sourceText,
  );
  const legacyAnnotation = /@(ignore|private|protected)\b/g;
  let token;

  while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      continue;
    }

    const comment = scanner.getTokenText();
    let match;

    while ((match = legacyAnnotation.exec(comment))) {
      const offset = scanner.getTokenPos() + match.index;
      const position = sourceFile.getLineAndCharacterOfPosition(offset);

      failures.push(
        `${file}:${String(position.line + 1)}:${String(position.character + 1)} ${match[0]}: use TypeScript visibility and @internal instead`,
      );
    }
  }
}

function isMethodLike(node) {
  return (
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node)
  );
}
