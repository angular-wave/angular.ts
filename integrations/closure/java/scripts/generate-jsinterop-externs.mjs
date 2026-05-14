import { readFileSync, writeFileSync } from "node:fs";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: generate-jsinterop-externs.mjs <input> <output>");
  process.exit(1);
}

const source = readFileSync(inputPath, "utf8");

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

  next = next.replace(/!?Object\b/g, "?");
  next = next.replace(/!?Array\b/g, "?");
  next = next.replace(/!?Map\b/g, "?");

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
      return `${prefix}{${simplifyJsDocTypeExpression(typeExpression)}}${suffix}`;
    })
    .join("\n");
}

const output = source.replace(/\/\*\*[\s\S]*?\*\//g, rewriteJsDoc);

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
