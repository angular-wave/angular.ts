import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const allowedLanguages = new Set(["bash", "css", "html", "js", "text", "ts"]);
const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const maximumLines = 30;
const failures = [];
let snippetCount = 0;

for (const file of walkFiles(join("docs", "content"), ".md")) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/gu);
  let snippet;

  for (const [index, line] of lines.entries()) {
    const fence = line.match(/^\s*```([^\s`]*)\s*$/u);
    if (!fence) {
      if (snippet) {
        snippet.lines.push(line);
        if (line.trim()) snippet.nonemptyLines++;
      }
      continue;
    }

    if (!snippet) {
      const language = fence[1];

      if (!allowedLanguages.has(language)) {
        failures.push(
          `${relative(".", file)}:${index + 1}: use a canonical code-fence language`,
        );
      }

      snippet = { language, line: index + 1, lines: [], nonemptyLines: 0 };
      snippetCount++;
      continue;
    }

    if (snippet.nonemptyLines > maximumLines) {
      failures.push(
        `${relative(".", file)}:${snippet.line}: ${snippet.nonemptyLines} non-empty lines exceeds the ${maximumLines}-line limit`,
      );
    }

    if (snippet.language === "html") {
      checkHtmlSnippet(file, snippet);
    }

    snippet = undefined;
  }

  if (snippet) {
    failures.push(
      `${relative(".", file)}:${snippet.line}: unclosed code fence`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    "Documentation snippets must be terse and use canonical fences.",
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `${snippetCount} documentation snippets use canonical fences, balanced HTML, and at most ${maximumLines} non-empty lines.`,
);

function checkHtmlSnippet(file, snippet) {
  const source = snippet.lines.join("\n");
  const stack = [];

  for (const { index, token } of htmlTokens(source)) {
    const match = token.match(/^<\s*(\/?)\s*([A-Za-z][\w:-]*)\b/u);
    if (!match) continue;

    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    const line =
      snippet.line + 1 + source.slice(0, index).split("\n").length - 1;

    if (voidElements.has(tag) || /\/\s*>$/u.test(token)) continue;

    if (!closing) {
      stack.push({ line, tag });
      continue;
    }

    const opening = stack.at(-1);
    if (opening?.tag === tag) {
      stack.pop();
      continue;
    }

    failures.push(
      `${relative(".", file)}:${line}: unexpected </${tag}>${opening ? `; expected </${opening.tag}>` : ""}`,
    );
  }

  for (const opening of stack) {
    failures.push(
      `${relative(".", file)}:${opening.line}: <${opening.tag}> is not closed`,
    );
  }
}

function* htmlTokens(source) {
  for (let index = 0; index < source.length; index++) {
    if (source[index] !== "<") continue;

    if (source.startsWith("<!--", index)) {
      const commentEnd = source.indexOf("-->", index + 4);
      index = commentEnd === -1 ? source.length : commentEnd + 2;
      continue;
    }

    let quote;
    let end = index + 1;

    for (; end < source.length; end++) {
      const character = source[end];
      if (quote) {
        if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        yield { index, token: source.slice(index, end + 1) };
        index = end;
        break;
      }
    }
  }
}

function walkFiles(root, extension) {
  if (!existsSync(root)) return [];

  return readdirSync(root).flatMap((entry) => {
    const file = join(root, entry);

    return statSync(file).isDirectory()
      ? walkFiles(file, extension)
      : file.endsWith(extension)
        ? [file]
        : [];
  });
}
