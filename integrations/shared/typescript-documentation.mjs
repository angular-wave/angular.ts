import ts from "typescript";

export function symbolDocumentation(checker, symbol, fallback) {
  const documentation = symbol
    ? ts.displayPartsToString(symbol.getDocumentationComment(checker))
    : "";

  return normalizeDocumentation(documentation) || fallback;
}

export function signatureDocumentation(checker, signature, fallback) {
  return (
    normalizeDocumentation(
      ts.displayPartsToString(signature.getDocumentationComment(checker)),
    ) || fallback
  );
}

export function parameterDocumentation(checker, parameter) {
  return symbolDocumentation(
    checker,
    parameter,
    `Value supplied for the ${parameter.name} parameter.`,
  ).replace(/^-\s+/u, "");
}

export function assertCallableDocumentation(name, documentation, parameters) {
  if (!normalizeDocumentation(documentation)) {
    throw new Error(`Public callable ${name} is missing documentation.`);
  }

  for (const parameter of parameters) {
    if (!parameter.name || !normalizeDocumentation(parameter.documentation)) {
      throw new Error(
        `Public callable ${name} has an undocumented parameter: ${parameter.name || "<unnamed>"}.`,
      );
    }
  }
}

export function typeDocumentation(checker, declaration, type) {
  const typeName = declaration.name.text;
  const symbols = [
    checker.getSymbolAtLocation(declaration.name),
    type.aliasSymbol,
    type.getSymbol(),
    referencedSymbol(checker, declaration.type),
  ];

  for (const symbol of symbols) {
    if (!symbol) continue;

    const documentation = symbolDocumentation(checker, resolveAlias(checker, symbol), "");
    if (documentation) return documentation;
  }

  return `Public AngularTS ${typeName} contract exposed through the ng namespace.`;
}

export function documentationLines(documentation, width = 96) {
  const words = normalizeDocumentation(documentation).split(" ").filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    if (!line || line.length + word.length + 1 <= width) {
      line = line ? `${line} ${word}` : word;
      continue;
    }

    lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

function referencedSymbol(checker, node) {
  if (!ts.isTypeReferenceNode(node)) return undefined;

  const symbol = checker.getSymbolAtLocation(node.typeName);
  return symbol ? resolveAlias(checker, symbol) : undefined;
}

function resolveAlias(checker, symbol) {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function normalizeDocumentation(documentation) {
  return documentation
    .replace(
      /\{@link(?:code|plain)?\s+([^}|\s]+)(?:\s*\|\s*([^}]+))?\}/gu,
      (_, target, label) => label ?? target,
    )
    .replaceAll("*/", "* /")
    .replace(/\s+/gu, " ")
    .trim();
}
