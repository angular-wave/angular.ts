import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const declarationPattern =
  /\/\*\*([\s\S]*?)\*\/\s*((?:ng|angular)\.[A-Za-z_$][\w$]*(?:\.prototype\.[A-Za-z_$][\w$]*)?)\s*(?:=|;)/g;

export function parseExternDocumentation(source) {
  const documentation = new Map();

  for (const match of source.matchAll(declarationPattern)) {
    const javadoc = formatJavadoc(match[1]);
    if (javadoc) {
      documentation.set(match[2], javadoc);
    }
  }

  return documentation;
}

export function applyJavadocs(source, documentation) {
  const jsTypeMatch = source.match(
    /@JsType\([^\n]*\bname\s*=\s*"([^"]+)"[^\n]*\)\npublic (?:class|interface) ([A-Za-z_$][\w$]*)/,
  );
  const jsFunctionMatch = source.match(
    /@(?:jsinterop\.annotations\.)?JsFunction\npublic interface ([A-Za-z_$][\w$]*)/,
  );
  const typeMatch = jsTypeMatch ?? jsFunctionMatch;

  if (!typeMatch) return source;

  const externName = jsTypeMatch ? jsTypeMatch[1] : `ng.${jsFunctionMatch[1]}`;
  const javaTypeName = jsTypeMatch ? jsTypeMatch[2] : jsFunctionMatch[1];
  const typeJavadoc = documentation.get(externName);
  let documented = typeJavadoc
    ? `${source.slice(0, typeMatch.index)}${typeJavadoc}\n${source.slice(typeMatch.index)}`
    : source;
  const lines = documented.split("\n");
  const output = [];
  let annotations = [];
  let depth = 0;
  let enteredType = false;

  for (const line of lines) {
    if (!enteredType) {
      output.push(line);
      if (line.startsWith(`public class ${javaTypeName}`) ||
          line.startsWith(`public interface ${javaTypeName}`)) {
        enteredType = true;
      }
      depth += braceDelta(line);
      continue;
    }

    if (depth === 1 && line.startsWith("@")) {
      annotations.push(line);
      continue;
    }

    if (depth === 1) {
      const memberName = javaScriptMemberName(line, annotations, javaTypeName);
      const memberJavadoc = memberName
        ? documentation.get(`${externName}.prototype.${memberName}`) ??
          documentation.get(`${externName}.${memberName}`)
        : undefined;

      if (memberJavadoc) output.push(memberJavadoc);
      output.push(...annotations);
      annotations = [];
    } else if (annotations.length > 0) {
      output.push(...annotations);
      annotations = [];
    }

    output.push(line);
    depth += braceDelta(line);
  }

  output.push(...annotations);
  return output.join("\n");
}

function formatJavadoc(comment) {
  const lines = comment
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").trimEnd())
    .filter((line) => line.trim().length > 0);
  const description = lines
    .filter((line) => !line.trimStart().startsWith("@"))
    .join("\n")
    .trim();

  if (!description) return undefined;

  const escaped = escapeJavadoc(description);
  const tags = lines.flatMap((line) => {
    const parameter = line.match(
      /^@param\s+\{[^}]+\}\s+([A-Za-z_$][\w$]*)(?:\s+(.+))?$/,
    );
    if (parameter) {
      return `@param ${parameter[1]} ${escapeJavadoc(
        parameter[2] || `Value supplied for the ${parameter[1]} parameter.`,
      )}`;
    }

    const returns = line.match(/^@return\s+\{[^}]+\}(?:\s+(.+))?$/);
    if (returns) return `@return ${escapeJavadoc(returns[1] || "Method result.")}`;
    return [];
  });
  const body = [...escaped.split("\n"), ...tags];

  return ["/**", ...body.map((line) => ` * ${line}`), " */"].join("\n");
}

function escapeJavadoc(value) {
  return value
    .replace(/\{@link\s+([^}]+)\}/g, "{@code $1}")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("*/", "*&#47;");
}

function javaScriptMemberName(line, annotations, javaTypeName) {
  const declarationName = readDeclarationName(line);
  if (!declarationName || declarationName === javaTypeName) return undefined;

  const annotationSource = annotations.join("\n");
  const explicitName = annotationSource.match(
    /@Js(?:Method|Property)\(name\s*=\s*"([^"]+)"\)/,
  )?.[1];
  if (explicitName) return explicitName;

  if (annotationSource.includes("@JsProperty")) {
    const accessor = declarationName.match(/^(?:get|set|is)(.+)$/);
    return accessor ? decapitalize(accessor[1]) : declarationName;
  }

  return declarationName;
}

function readDeclarationName(line) {
  const method = line.match(/([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*(?:;|\{)?$/);
  if (method) return method[1];

  return line.match(/([A-Za-z_$][\w$]*)\s*;$/)?.[1];
}

function decapitalize(value) {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function braceDelta(line) {
  return [...line].reduce(
    (total, character) =>
      total + (character === "{" ? 1 : character === "}" ? -1 : 0),
    0,
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const [, , externsPath, generatedSourcesDir] = process.argv;
  if (!externsPath || !generatedSourcesDir) {
    console.error(
      "Usage: apply-jsinterop-javadocs.mjs <externs-file> <generated-sources-dir>",
    );
    process.exit(1);
  }

  const documentation = parseExternDocumentation(
    readFileSync(externsPath, "utf8"),
  );

  for (const javaPath of listJavaFiles(generatedSourcesDir)) {
    const source = readFileSync(javaPath, "utf8");
    const documented = applyJavadocs(source, documentation);
    if (documented !== source) writeFileSync(javaPath, documented);
  }
}

function listJavaFiles(directory) {
  const entries = readFileSystemEntries(directory);
  return entries.flatMap((entry) =>
    entry.isDirectory()
      ? listJavaFiles(path.join(directory, entry.name))
      : entry.name.endsWith(".java")
        ? [path.join(directory, entry.name)]
        : [],
  );
}

function readFileSystemEntries(directory) {
  return readdirSync(directory, { withFileTypes: true });
}
