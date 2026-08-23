import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const failures = [];

for (const file of sourceFiles("src")) checkFile(file);

if (failures.length) {
  console.error("Exception boundary policy violations found.");
  console.error(
    "Forward caught values unchanged and exactly once; do not combine $exceptionHandler with another terminal failure path.",
  );

  for (const failure of failures) console.error(`- ${failure}`);

  process.exitCode = 1;
} else {
  console.log(
    "Error policy check passed; exception boundaries have one unmodified owner.",
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
  const catchHandlerCalls = new Map();

  visit(sourceFile);

  for (const [catchClause, calls] of catchHandlerCalls) {
    if (calls.length > 1) {
      report(
        catchClause,
        "a catch block forwards the same failure boundary more than once",
      );
    }

    if (containsThrowOutsideNestedFunction(catchClause.block)) {
      report(
        catchClause,
        "a catch block both invokes the exception handler and throws",
      );
    }

    if (containsConsoleReportOutsideNestedFunction(catchClause.block)) {
      report(
        catchClause,
        "a catch block both invokes the exception handler and reports to console",
      );
    }
  }

  function visit(node) {
    if (ts.isCallExpression(node) && isExceptionHandlerCall(node.expression)) {
      if (node.arguments.length !== 1) {
        report(node, "$exceptionHandler must receive exactly one value");
      }

      const catchClause = findCatchClause(node);

      if (catchClause) {
        const calls = catchHandlerCalls.get(catchClause) ?? [];

        calls.push(node);
        catchHandlerCalls.set(catchClause, calls);

        const catchVariable = catchClause.variableDeclaration?.name;
        const argument = node.arguments[0];

        if (
          catchVariable &&
          ts.isIdentifier(catchVariable) &&
          argument &&
          (!ts.isIdentifier(argument) || argument.text !== catchVariable.text)
        ) {
          report(
            node,
            `forward the caught value '${catchVariable.text}' unchanged`,
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  function report(node, message) {
    const position = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );

    failures.push(
      `${file}:${String(position.line + 1)}:${String(position.character + 1)} ${message}`,
    );
  }
}

function isExceptionHandlerCall(expression) {
  if (ts.isIdentifier(expression)) {
    return isExceptionHandlerName(expression.text);
  }

  if (
    ts.isPropertyAccessExpression(expression) ||
    ts.isPropertyAccessChain(expression)
  ) {
    return isExceptionHandlerName(expression.name.text);
  }

  return false;
}

function isExceptionHandlerName(name) {
  return /^(?:\$|_)?exceptionHandler$/.test(name);
}

function findCatchClause(node) {
  let current = node.parent;

  while (current) {
    if (ts.isCatchClause(current)) return current;
    if (ts.isFunctionLike(current)) return undefined;

    current = current.parent;
  }

  return undefined;
}

function containsThrowOutsideNestedFunction(node) {
  let found = false;

  visit(node);

  return found;

  function visit(current) {
    if (current !== node && ts.isFunctionLike(current)) return;

    if (ts.isThrowStatement(current)) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }
}

function containsConsoleReportOutsideNestedFunction(node) {
  let found = false;

  visit(node);

  return found;

  function visit(current) {
    if (current !== node && ts.isFunctionLike(current)) return;

    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      ts.isIdentifier(current.expression.expression) &&
      current.expression.expression.text === "console" &&
      ["error", "log", "warn"].includes(current.expression.name.text)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }
}
