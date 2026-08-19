import { readFileSync, writeFileSync } from "node:fs";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: generate-jsinterop-externs.mjs <input> <output>");
  process.exit(1);
}

const source = readFileSync(inputPath, "utf8");

const preservedFunctionTypedefs = new Set([
  "function(): !ng.Directive",
  "function(!ng.Scope, !HTMLElement): void",
]);

function replaceTemplatizedType(input, name, replacement) {
  let output = "";
  let index = 0;

  while (index < input.length) {
    const candidates = [`!${name}<`, `${name}<`]
      .map((token) => ({ token, start: input.indexOf(token, index) }))
      .filter(({ start }) => start !== -1);

    if (candidates.length === 0) {
      output += input.slice(index);
      break;
    }

    const { token, start } = candidates.reduce((left, right) =>
      left.start < right.start ? left : right,
    );
    let cursor = start + token.length;
    let depth = 1;

    while (cursor < input.length && depth > 0) {
      const char = input[cursor];

      if (char === "<") depth += 1;
      if (char === ">") depth -= 1;
      cursor += 1;
    }

    if (depth !== 0) {
      output += input.slice(index);
      break;
    }

    output += input.slice(index, start);
    output += replacement;
    index = cursor;
  }

  return output;
}

function simplifyJsDocTypeExpression(typeExpression) {
  let next = typeExpression;

  for (const nativeType of ["Array", "Map", "Object"]) {
    next = replaceTemplatizedType(next, nativeType, "?");
  }

  next = next.replace(/(^|[^\w$])!?Object\b/g, "$1?");
  next = next.replace(/(^|[^\w$])!?Array\b/g, "$1?");
  next = next.replace(/(^|[^\w$])!?Map\b/g, "$1?");

  if (next.includes("function(")) {
    return "?";
  }

  return next;
}

function rewriteJsDoc(jsDoc) {
  return jsDoc
    .split("\n")
    .map((line) => {
      const match = line.match(
        /^(\s*\*\s*@(?:param|return|type|typedef)\s*)\{(.+)\}(.*)$/,
      );

      if (!match) {
        return line;
      }

      const [, prefix, typeExpression, suffix] = match;

      if (
        line.includes("@typedef") &&
        preservedFunctionTypedefs.has(typeExpression)
      ) {
        return line;
      }

      return `${prefix}{${simplifyJsDocTypeExpression(typeExpression)}}${suffix}`;
    })
    .join("\n");
}

function replaceMemberType(input, declaration, typeExpression) {
  const declarationIndex = input.indexOf(declaration);

  if (declarationIndex === -1) {
    throw new Error(`Missing extern declaration: ${declaration}`);
  }

  const jsDocStart = input.lastIndexOf("/**", declarationIndex);
  const jsDocEnd = input.indexOf("*/", jsDocStart) + 2;
  const jsDoc = input.slice(jsDocStart, jsDocEnd);
  const rewritten = jsDoc.replace(
    /@type\s*\{[^}\n]+\}/,
    `@type {${typeExpression}}`,
  );

  return input.slice(0, jsDocStart) + rewritten + input.slice(jsDocEnd);
}

function replaceParameterType(input, declaration, parameter, typeExpression) {
  const declarationIndex = input.indexOf(declaration);

  if (declarationIndex === -1) {
    throw new Error(`Missing extern declaration: ${declaration}`);
  }

  const jsDocStart = input.lastIndexOf("/**", declarationIndex);
  const jsDocEnd = input.indexOf("*/", jsDocStart) + 2;
  const jsDoc = input.slice(jsDocStart, jsDocEnd);
  const pattern = new RegExp(`(@param\\s*)\\{[^}\\n]+\\}(\\s+${parameter}\\b)`);
  const rewritten = jsDoc.replace(pattern, `$1{${typeExpression}}$2`);

  return input.slice(0, jsDocStart) + rewritten + input.slice(jsDocEnd);
}

let output = source.replace(/\/\*\*[\s\S]*?\*\//g, rewriteJsDoc);

output = replaceMemberType(
  output,
  "ng.Directive.prototype.link;",
  "(!ng.DirectiveLinkFn|undefined)",
);
output = replaceParameterType(
  output,
  "ng.NgModule.prototype.directive = function",
  "directiveFactory",
  "!ng.DirectiveFactoryFn",
);

writeFileSync(
  outputPath,
  [
    "/**",
    " * Java/J2CL-compatible externs generated from AngularTS strict Closure externs.",
    " * Do not edit directly. Regenerate with scripts/generate-jsinterop-externs.mjs.",
    " */",
    output,
  ].join("\n"),
);
