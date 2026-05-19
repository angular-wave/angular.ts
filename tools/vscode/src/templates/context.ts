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
  const pipeIndex = expression.lastIndexOf("|");
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
  const filterRe = /\|\s*([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;

  while ((match = filterRe.exec(expression))) {
    const name = match[1];
    const start = expressionOffset + match.index + match[0].lastIndexOf(name);
    const end = start + name.length;
    if (offset >= start && offset <= end) return { name, start, end };
  }

  return undefined;
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
