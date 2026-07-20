import { readFileSync } from "node:fs";
import ts from "typescript";

const parse = (path) =>
  ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

const tokenSource = parse("src/injection-tokens.ts");
const interfaceSource = parse("src/interface.ts");
const namespaceSource = parse("src/namespace.ts");
const docsSource = parse("src/docs.ts");
const failures = [];

function unwrap(expression) {
  let current = expression;

  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function variableDeclarations(source) {
  return source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations]);
}

function findVariable(source, name) {
  return variableDeclarations(source).find(
    (declaration) =>
      ts.isIdentifier(declaration.name) && declaration.name.text === name,
  );
}

function propertyName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name)
    ? name.text
    : undefined;
}

function collectNamedExports(source) {
  return new Set(
    source.statements.flatMap((statement) => {
      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        return statement.exportClause.elements.map(
          (element) => element.name.text,
        );
      }

      if (
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        ) &&
        "name" in statement &&
        statement.name &&
        ts.isIdentifier(statement.name)
      ) {
        return [statement.name.text];
      }

      return [];
    }),
  );
}

function collectNamespaceTypes(source) {
  const names = new Set();

  function visit(node, inNamespace = false) {
    if (ts.isModuleDeclaration(node)) {
      const nested =
        inNamespace || (ts.isIdentifier(node.name) && node.name.text === "ng");

      if (node.body) visit(node.body, nested);
      return;
    }

    if (
      inNamespace &&
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))
    ) {
      names.add(node.name.text);
      return;
    }

    ts.forEachChild(node, (child) => visit(child, inNamespace));
  }

  visit(source);
  return names;
}

const tokenDefinitions = new Map();

for (const declaration of variableDeclarations(tokenSource)) {
  if (
    !ts.isIdentifier(declaration.name) ||
    !declaration.name.text.startsWith("_") ||
    !declaration.initializer
  ) {
    continue;
  }

  const initializer = unwrap(declaration.initializer);

  if (ts.isStringLiteral(initializer)) {
    tokenDefinitions.set(declaration.name.text, initializer.text);
  }
}

const publicTokensDeclaration = findVariable(
  interfaceSource,
  "PublicInjectionTokens",
);
const publicTokensInitializer = publicTokensDeclaration?.initializer
  ? unwrap(publicTokensDeclaration.initializer)
  : undefined;

if (
  !publicTokensInitializer ||
  !ts.isObjectLiteralExpression(publicTokensInitializer)
) {
  throw new Error("Unable to read PublicInjectionTokens from src/interface.ts");
}

const publicTokenIdentifiers = new Set();
const publicTokenNames = new Set();

for (const property of publicTokensInitializer.properties) {
  if (!ts.isPropertyAssignment(property)) continue;

  const name = propertyName(property.name);
  const initializer = unwrap(property.initializer);

  if (name) publicTokenNames.add(name);
  if (ts.isIdentifier(initializer)) {
    publicTokenIdentifiers.add(initializer.text);
  }
}

const internalTokens = [...tokenDefinitions].filter(
  ([identifier]) => !publicTokenIdentifiers.has(identifier),
);
const providerTokens = [...tokenDefinitions].filter(
  ([identifier, token]) =>
    identifier.endsWith("Provider") || token.endsWith("Provider"),
);

if (internalTokens.length > 0) {
  failures.push(
    `Internal injection tokens are not allowed: ${internalTokens
      .map(([identifier, token]) => `${identifier} (${token})`)
      .join(", ")}`,
  );
}

if (providerTokens.length > 0) {
  failures.push(
    `Provider injection tokens are not allowed: ${providerTokens
      .map(([identifier, token]) => `${identifier} (${token})`)
      .join(", ")}`,
  );
}

const injectionTokenMap = interfaceSource.statements.find(
  (statement) =>
    ts.isInterfaceDeclaration(statement) &&
    statement.name.text === "InjectionTokenMap",
);

if (!injectionTokenMap || !ts.isInterfaceDeclaration(injectionTokenMap)) {
  throw new Error("Unable to locate InjectionTokenMap in src/interface.ts");
}

const contracts = new Map();

for (const member of injectionTokenMap.members) {
  if (!ts.isPropertySignature(member) || !member.type) continue;

  const token = propertyName(member.name);
  let contract;

  if (
    ts.isTypeReferenceNode(member.type) &&
    ts.isQualifiedName(member.type.typeName) &&
    ts.isIdentifier(member.type.typeName.left) &&
    member.type.typeName.left.text === "ng" &&
    ts.isIdentifier(member.type.typeName.right)
  ) {
    contract = member.type.typeName.right.text;
  }

  if (token) contracts.set(token, contract);
}

const namespaceTypes = collectNamespaceTypes(namespaceSource);
const documentedExports = collectNamedExports(docsSource);

for (const token of publicTokenNames) {
  const contract = contracts.get(token);

  if (!contract) {
    failures.push(`${token} does not map directly to a named ng contract`);
    continue;
  }

  if (!namespaceTypes.has(contract)) {
    failures.push(
      `${token} contract ng.${contract} is missing from namespace.ts`,
    );
  }

  if (!documentedExports.has(contract)) {
    failures.push(`${token} contract ng.${contract} is missing from docs.ts`);
  }
}

for (const token of contracts.keys()) {
  if (!publicTokenNames.has(token)) {
    failures.push(`${token} has an injectable contract but is not public`);
  }
}

if (failures.length > 0) {
  console.error("Injection composition check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const report = {
  publicTokens: publicTokenNames.size,
  namedContracts: contracts.size,
  internalTokens: internalTokens.length,
  providerTokens: providerTokens.length,
  status: "source-contract-complete",
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `Injection composition: ${report.publicTokens} public tokens, ` +
      `${report.namedContracts} named contracts, no internal or provider tokens.`,
  );
}
