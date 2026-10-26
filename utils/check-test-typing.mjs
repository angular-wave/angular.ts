import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/** Count compiler bypasses without treating strings or ordinary comments as directives. */
export function collectEscapes(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const counts = {};
  const comments = new Set();
  const add = (kind) => {
    counts[kind] = (counts[kind] ?? 0) + 1;
  };
  function inspectComment(range) {
    if (comments.has(range.pos)) return;
    comments.add(range.pos);
    const directive = text
      .slice(range.pos, range.end)
      .replace(/^\/[/\*]\s*/, "");
    const match = /^@ts-(nocheck|ignore)\b/.exec(directive);
    if (match) add(`@ts-${match[1]}`);
  }
  function visit(node, inGlobal = false) {
    for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? [])
      inspectComment(range);
    for (const range of ts.getTrailingCommentRanges(text, node.end) ?? [])
      inspectComment(range);
    if (node.kind === ts.SyntaxKind.AnyKeyword) add("explicitAny");
    if (ts.isNonNullExpression(node)) add("nonNullAssertion");
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      let inner = node.expression;
      while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
      if (ts.isAsExpression(inner) || ts.isTypeAssertionExpression(inner))
        add("doubleAssertion");
      if (node.type.kind === ts.SyntaxKind.NeverKeyword) add("neverAssertion");
    }
    const global =
      inGlobal ||
      (ts.isModuleDeclaration(node) &&
        !!(node.flags & ts.NodeFlags.GlobalAugmentation));
    if (
      global &&
      ts.isInterfaceDeclaration(node) &&
      ["Node", "Element", "ChildNode"].includes(node.name.text)
    )
      add("domAugmentation");
    ts.forEachChild(node, (child) => visit(child, global));
  }
  visit(source);
  return counts;
}

/** Existing exceptions may shrink; a new bypass or an increased count fails the check. */
export function compareEscapes(actual, baseline) {
  return Object.entries(actual).flatMap(([file, counts]) =>
    Object.entries(counts)
      .filter(([kind, count]) => count > (baseline[file]?.[kind] ?? 0))
      .map(
        ([kind, count]) =>
          `${file}: ${kind} increased from ${baseline[file]?.[kind] ?? 0} to ${count}`,
      ),
  );
}

function* testFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* testFiles(file);
    else if (/\.(spec|test)\.tsx?$/.test(entry.name)) yield file;
  }
}

export function scanTests(directory = "src") {
  return Object.fromEntries(
    [...testFiles(directory)].sort().flatMap((file) => {
      const counts = collectEscapes(file, fs.readFileSync(file, "utf8"));
      return Object.keys(counts).length ? [[file, counts]] : [];
    }),
  );
}

function main() {
  const baseline = JSON.parse(
    fs.readFileSync(
      new URL("./test-typing-baseline.json", import.meta.url),
      "utf8",
    ),
  );
  const actual = scanTests();
  const failures = compareEscapes(actual, baseline);
  if (failures.length) {
    console.error(
      "Test type-checking bypasses increased. Type the fixture or use a documented @ts-expect-error for a deliberately invalid input.",
    );
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }
  const unchecked = Object.values(actual).reduce(
    (sum, counts) => sum + (counts["@ts-nocheck"] ?? 0),
    0,
  );
  console.log(
    `Test typing check passed; ${unchecked} legacy file-wide suppressions remain.`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
