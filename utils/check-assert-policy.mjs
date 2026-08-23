import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const allowedAssertions = new Set([
  "assertInvariant",
  "assertInvariantDefined",
]);
const failures = [];

for (const file of sourceFiles("src")) checkFile(file);

if (failures.length) {
  console.error(
    "Production assert names are reserved for framework-owned invariants.",
  );
  console.error(
    "Use validate* for supplied data, require* for arguments/capabilities, and ensure* for lifecycle preconditions.",
  );

  for (const failure of failures) console.error(`- ${failure}`);

  process.exitCode = 1;
} else {
  console.log(
    "Assertion policy check passed; production assertions are explicit framework invariants.",
  );
}

function* sourceFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* sourceFiles(file);
      continue;
    }

    if (
      entry.isFile() &&
      /\.(?:cts|mts|tsx?)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts") &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".test.ts")
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

  visit(sourceFile);

  function visit(node) {
    if (ts.isIdentifier(node)) {
      const name = node.text;

      if (/^_?assert(?:$|[A-Z])/.test(name) && !allowedAssertions.has(name)) {
        const position = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );

        failures.push(
          `${file}:${String(position.line + 1)}:${String(position.character + 1)} ${name}`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }
}
