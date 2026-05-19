export interface HtmlAttribute {
  name: string;
  start: number;
  end: number;
  value?: string;
  valueStart?: number;
  valueEnd?: number;
}

export interface HtmlElement {
  tagName: string;
  start: number;
  end: number;
  attributes: HtmlAttribute[];
}

export function scanHtmlElements(text: string): HtmlElement[] {
  const elements: HtmlElement[] = [];
  const tagRe = /<\s*([A-Za-z][\w:.-]*)([^<>]*?)\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(text))) {
    const full = match[0];
    if (/^<\s*\//.test(full) || /^<\s*!/.test(full)) continue;

    const tagName = match[1];
    const attrText = match[2] ?? "";
    const attrOffset = match.index + full.indexOf(attrText);
    const attributes = scanAttributes(attrText, attrOffset);

    elements.push({
      tagName,
      start: match.index,
      end: match.index + full.length,
      attributes,
    });
  }

  return elements;
}

function scanAttributes(text: string, offset: number): HtmlAttribute[] {
  const attributes: HtmlAttribute[] = [];
  const attrRe =
    /([A-Za-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(text))) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4];
    const nameStart = offset + match.index;
    const valueIndex = value === undefined ? -1 : match[0].indexOf(value);

    attributes.push({
      name,
      start: nameStart,
      end: nameStart + name.length,
      value,
      valueStart: valueIndex >= 0 ? offset + match.index + valueIndex : undefined,
      valueEnd:
        valueIndex >= 0 && value !== undefined
          ? offset + match.index + valueIndex + value.length
          : undefined,
    });
  }

  return attributes;
}
