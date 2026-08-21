import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const roots = ["src", "@types"];

const allowedMethods = new Set();

const allowedProperties = new Set([
  "$angular",
  "$anchorScroll",
  "$animate",
  "$attempt",
  "$aria",
  "$compile",
  "$connection",
  "$controller",
  "$cookie",
  "$count",
  "$data",
  "$delegate",
  "$default",
  "$document",
  "$element",
  "$entry",
  "$entries",
  "$event",
  "$eventBus",
  "$exceptionHandler",
  "$filter",
  "$hashKey",
  "$htmlCanvas",
  "$http",
  "$httpParamSerializer",
  "$inject",
  "$injector",
  "$injectorProvider",
  "$interpolate",
  "$location",
  "$locals",
  "$log",
  "$machine",
  "$message",
  "$ngView",
  "$nonscope",
  "$parse",
  "$rest",
  "$resolve",
  "$res",
  "$result",
  "$rootElement",
  "$rootScope",
  "$sce",
  "$sceDelegate",
  "$scope",
  "$security",
  "$serviceWorker",
  "$sse",
  "$state",
  "$state$",
  "$stateRegistry",
  "$storage",
  "$stream",
  "$templateCache",
  "$templateRequest",
  "$text",
  "$transclude",
  "$transition$",
  "$transitions",
  "$url",
  "$wasm",
  "$webComponent",
  "$websocket",
  "$webTransport",
  "$window",
  "$worker",
  "$workflow",
  "$workflowSupervisor",
]);

const failures = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;

  for (const file of sourceFiles(root)) {
    checkFile(file);
  }
}

if (failures.length > 0) {
  console.error(
    "Public methods must not use the legacy AngularJS/jqLite dollar prefix.",
  );
  console.error(
    "Only reviewed injection, expression, lifecycle-event, and metadata protocol names may retain it.",
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    "Dollar-prefixed API check passed; only reviewed protocol members remain.",
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
      file.endsWith(".ts") &&
      !file.endsWith(".spec.ts") &&
      !file.endsWith(".test.ts")
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
    const member = readMember(node);

    if (member?.name.startsWith("$")) {
      const allowed = member.method
        ? allowedMethods.has(member.name)
        : allowedProperties.has(member.name);

      if (!allowed) {
        const position = sourceFile.getLineAndCharacterOfPosition(
          node.name.getStart(sourceFile),
        );

        failures.push(
          `${file}:${String(position.line + 1)}:${String(position.character + 1)} ${member.name}`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }
}

function readMember(node) {
  const method =
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node);
  const property =
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isPropertyAssignment(node);

  if ((!method && !property) || !node.name) return undefined;

  if (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)) {
    return { method, name: node.name.text };
  }

  return undefined;
}
