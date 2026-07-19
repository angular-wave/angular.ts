import { scanAngularTsFilterPipes } from "./filters";

export interface AttributeContext {
  rangeStart: number;
  prefix: string;
  tagName?: string;
  attributeNames: string[];
}

export interface OpenTagContext {
  tagName: string;
  tagStart: number;
  tagEnd: number;
  attributeNames: string[];
}

export interface FilterCompletionContext {
  rangeStart: number;
  prefix: string;
}

export interface TagCompletionContext {
  rangeStart: number;
  prefix: string;
}

export interface ExpressionIdentifierCompletionContext {
  rangeStart: number;
  prefix: string;
}

export function getAttributeCompletionContext(
  textBeforeCursor: string,
): AttributeContext | undefined {
  const tagStart = textBeforeCursor.lastIndexOf("<");
  if (tagStart < 0) return undefined;

  const afterTag = textBeforeCursor.slice(tagStart);
  if (/^<\s*\//.test(afterTag)) return undefined;
  if (afterTag.includes(">")) return undefined;
  if (/=\s*(?:"[^"]*|'[^']*|`[^`]*)$/.test(afterTag)) return undefined;

  const prefixMatch = /(?:^|\s)([A-Za-z_:][\w:.-]*)?$/.exec(afterTag);
  if (!prefixMatch) return undefined;

  const prefix = prefixMatch[1] ?? "";
  const openTag = parseOpenTag(afterTag, tagStart);

  return {
    rangeStart: textBeforeCursor.length - prefix.length,
    prefix,
    tagName: openTag?.tagName,
    attributeNames: openTag?.attributeNames ?? [],
  };
}

export function isSupportedTemplateDocument(languageId: string): boolean {
  return [
    "html",
    "typescript",
    "javascript",
    "typescriptreact",
    "javascriptreact",
  ].includes(languageId);
}

export function getTagCompletionContext(
  textBeforeCursor: string,
): TagCompletionContext | undefined {
  const tagStart = textBeforeCursor.lastIndexOf("<");
  if (tagStart < 0) return undefined;

  const afterTag = textBeforeCursor.slice(tagStart);
  if (/^<\s*\//.test(afterTag)) return undefined;
  if (afterTag.includes(">")) return undefined;

  const match = /^<\s*([A-Za-z][\w:.-]*)?$/.exec(afterTag);
  if (!match) return undefined;

  const prefix = match[1] ?? "";
  return {
    rangeStart: textBeforeCursor.length - prefix.length,
    prefix,
  };
}

export function attributeNameAt(
  text: string,
  offset: number,
): { name: string; start: number; end: number } | undefined {
  const isNameChar = (char: string): boolean => /[A-Za-z0-9_:\-.]/.test(char);
  let start = offset;
  let end = offset;

  while (start > 0 && isNameChar(text[start - 1] ?? "")) start--;
  while (end < text.length && isNameChar(text[end] ?? "")) end++;

  if (start === end) return undefined;

  const name = text.slice(start, end);
  if (!/[A-Za-z]/.test(name)) return undefined;

  return { name, start, end };
}

export function getFilterCompletionContext(
  textBeforeCursor: string,
): FilterCompletionContext | undefined {
  const interpolationStart = textBeforeCursor.lastIndexOf("{{");
  if (interpolationStart < 0) return undefined;

  const interpolationEnd = textBeforeCursor.lastIndexOf("}}");
  if (interpolationEnd > interpolationStart) return undefined;

  const expression = textBeforeCursor.slice(interpolationStart + 2);
  const pipeIndex = findLastTopLevelPipe(expression);
  if (pipeIndex < 0) return undefined;

  const afterPipe = expression.slice(pipeIndex + 1);
  const match = /^\s*([A-Za-z_$][\w$]*)?$/.exec(afterPipe);
  if (!match) return undefined;

  const prefix = match[1] ?? "";
  return {
    rangeStart: textBeforeCursor.length - prefix.length,
    prefix,
  };
}

export function getExpressionIdentifierCompletionContext(
  textBeforeCursor: string,
): ExpressionIdentifierCompletionContext | undefined {
  const expression = expressionBeforeCursor(textBeforeCursor);
  if (!expression) return undefined;

  const pipeIndex = findLastTopLevelPipe(expression.text);
  if (pipeIndex >= 0 && pipeIndex > expression.text.lastIndexOf(",")) {
    return undefined;
  }

  const match = /(?:^|[^.$\w])([$A-Za-z_][$\w]*)?$/.exec(expression.text);
  if (!match) return undefined;

  const prefix = match[1] ?? "";
  return {
    rangeStart: textBeforeCursor.length - prefix.length,
    prefix,
  };
}

function expressionBeforeCursor(
  textBeforeCursor: string,
): { text: string; start: number } | undefined {
  const interpolationStart = textBeforeCursor.lastIndexOf("{{");
  const interpolationEnd = textBeforeCursor.lastIndexOf("}}");
  if (interpolationStart >= 0 && interpolationEnd < interpolationStart) {
    return {
      text: textBeforeCursor.slice(interpolationStart + 2),
      start: interpolationStart + 2,
    };
  }

  const attrMatch =
    /(?:^|[\s<])(?:data-)?ng[-A-Z][\w:.-]*\s*=\s*(["'`])([^"'`]*)$/.exec(
      textBeforeCursor,
    );
  if (!attrMatch) return undefined;

  return {
    text: attrMatch[2],
    start: textBeforeCursor.length - attrMatch[2].length,
  };
}

export function filterNameAt(
  text: string,
  offset: number,
): { name: string; start: number; end: number } | undefined {
  const interpolationStart = text.lastIndexOf("{{", offset);
  if (interpolationStart < 0) return undefined;

  const interpolationEnd = text.indexOf("}}", interpolationStart);
  if (interpolationEnd >= 0 && offset > interpolationEnd) return undefined;

  const expressionEnd = interpolationEnd >= 0 ? interpolationEnd : text.length;
  const expression = text.slice(interpolationStart + 2, expressionEnd);
  const expressionOffset = interpolationStart + 2;

  for (const filter of scanAngularTsFilterPipes(expression, expressionOffset)) {
    if (offset >= filter.start && offset <= filter.end) {
      return filter;
    }
  }

  return undefined;
}

function findLastTopLevelPipe(expression: string): number {
  let quote: string | undefined;
  let escaped = false;
  let depth = 0;
  let lastPipe = -1;

  for (let index = 0; index < expression.length; index++) {
    const char = expression[index];

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

    if (char === "(" || char === "[" || char === "{") {
      depth++;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (
      char === "|" &&
      depth === 0 &&
      expression[index + 1] !== "|" &&
      expression[index - 1] !== "|"
    ) {
      lastPipe = index;
    }
  }

  return lastPipe;
}

export function getOpenTagContextAt(
  text: string,
  offset: number,
): OpenTagContext | undefined {
  const tagStart = text.lastIndexOf("<", offset);
  if (tagStart < 0) return undefined;

  const tagEnd = text.indexOf(">", tagStart);
  if (tagEnd >= 0 && tagEnd < offset) return undefined;

  const segmentEnd = tagEnd >= 0 ? tagEnd + 1 : offset;
  const segment = text.slice(tagStart, segmentEnd);
  return parseOpenTag(segment, tagStart);
}

function parseOpenTag(
  segment: string,
  absoluteTagStart: number,
): OpenTagContext | undefined {
  if (/^<\s*\//.test(segment) || /^<\s*!/.test(segment)) return undefined;

  const tagMatch = /^<\s*([A-Za-z][\w:.-]*)/.exec(segment);
  if (!tagMatch) return undefined;

  const attributeNames: string[] = [];
  const attrText = segment.slice(tagMatch[0].length);
  const attrRe = /(?:^|\s)([A-Za-z_:][\w:.-]*)(?=\s*(?:=|$|\/?>))/g;
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(attrText))) {
    attributeNames.push(match[1]);
  }

  return {
    tagName: tagMatch[1],
    tagStart: absoluteTagStart,
    tagEnd: absoluteTagStart + segment.length,
    attributeNames,
  };
}
