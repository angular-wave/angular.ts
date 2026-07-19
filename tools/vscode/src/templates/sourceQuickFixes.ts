export interface MissingDiTokenSuggestion {
  insertOffset: number;
  insertText: string;
  tokenNames: string[];
}

export interface ComponentBindingInsertion {
  insertOffset: number;
  insertText: string;
  bindingName: string;
}

export function suggestMissingDiTokensFromInlineArray(
  text: string,
): MissingDiTokenSuggestion | undefined {
  const match = /^\[((?:\s*(['"`])[^'"`]*\2\s*,)+)\s*function\s*\(([^)]*)\)/.exec(
    text,
  );
  if (!match) return undefined;

  const tokens = parseStringTokens(match[1]);
  const params = parseParams(match[3]);
  if (!tokens.length || tokens.length >= params.length) return undefined;

  const quote = tokens[0]?.quote ?? `"`;
  const tokenNames = params.slice(tokens.length);
  const functionIndex = text.indexOf("function", match[1].length);
  if (functionIndex < 0 || !tokenNames.length) return undefined;

  return {
    insertOffset: functionIndex,
    insertText: tokenNames.map((name) => `${quote}${name}${quote}, `).join(""),
    tokenNames,
  };
}

export function suggestComponentBindingInsertion(
  text: string,
  registrationOffset: number,
  bindingName: string,
): ComponentBindingInsertion | undefined {
  const callRange = readCallRange(text, registrationOffset);
  if (!callRange) return undefined;

  const objectOpen = text.indexOf("{", callRange.open);
  if (objectOpen < 0 || objectOpen > callRange.close) return undefined;

  const objectClose = findMatchingBracket(text, objectOpen, "{", "}");
  if (objectClose < 0 || objectClose > callRange.close) return undefined;

  const objectText = text.slice(objectOpen, objectClose + 1);
  const bindingsMatch = /\bbindings\s*:\s*\{/.exec(objectText);
  if (bindingsMatch) {
    const bindingsOpen = objectOpen + bindingsMatch.index + bindingsMatch[0].lastIndexOf("{");
    const bindingsClose = findMatchingBracket(text, bindingsOpen, "{", "}");
    if (bindingsClose < 0 || bindingsClose > objectClose) return undefined;

    const inner = text.slice(bindingsOpen + 1, bindingsClose);
    if (inner.includes("\n")) {
      const closeIndent = readLineIndent(text, bindingsClose);
      const bindingIndent = `${closeIndent}  `;
      const separator = inner.trim().endsWith(",") || inner.trim() === "" ? "" : ",";

      return {
        insertOffset: bindingsClose,
        insertText: `${separator}\n${bindingIndent}${bindingName}: "<"\n${closeIndent}`,
        bindingName,
      };
    }

    const separator = inner.trim() && !inner.trim().endsWith(",") ? ", " : " ";
    return {
      insertOffset: bindingsClose,
      insertText: `${separator}${bindingName}: "<"`,
      bindingName,
    };
  }

  const objectInner = text.slice(objectOpen + 1, objectClose);
  if (objectInner.includes("\n")) {
    const closeIndent = readLineIndent(text, objectClose);
    const propertyIndent = `${closeIndent}  `;

    return {
      insertOffset: objectOpen + 1,
      insertText: `\n${propertyIndent}bindings: { ${bindingName}: "<" },`,
      bindingName,
    };
  }

  return {
    insertOffset: objectOpen + 1,
    insertText: ` bindings: { ${bindingName}: "<" },`,
    bindingName,
  };
}

function parseStringTokens(text: string): Array<{ name: string; quote: string }> {
  const tokens: Array<{ name: string; quote: string }> = [];
  const stringRe = /(['"`])([^'"`]*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = stringRe.exec(text))) {
    tokens.push({ name: match[2], quote: match[1] });
  }

  return tokens;
}

function parseParams(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean);
}

function readCallRange(
  text: string,
  start: number,
): { open: number; close: number } | undefined {
  const open = text.indexOf("(", start);
  if (open < 0) return undefined;

  const close = findMatchingBracket(text, open, "(", ")");
  if (close < 0) return undefined;

  return { open, close };
}

function findMatchingBracket(
  text: string,
  open: number,
  openChar: string,
  closeChar: string,
): number {
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;

  for (let index = open; index < text.length; index++) {
    const char = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === openChar) depth++;
    if (char === closeChar) depth--;
    if (depth === 0) return index;
  }

  return -1;
}

function readLineIndent(text: string, offset: number): string {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  const match = /^[ \t]*/.exec(text.slice(lineStart, offset));
  return match?.[0] ?? "";
}
