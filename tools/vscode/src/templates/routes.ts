import type { AngularTsCatalogEntry } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";
import { scanHtmlElements, type HtmlElement } from "./htmlScanner";
import type { TemplateDiagnostic } from "./diagnostics";

export type RouteTemplateDiagnosticCode =
  | "unknownRoute"
  | "missingRouteParam"
  | "unknownRouteParam";

export interface RouteNameCompletionContext {
  kind: "route-name";
  start: number;
  end: number;
  prefix: string;
}

export interface RouteParamCompletionContext {
  kind: "route-param";
  start: number;
  end: number;
  prefix: string;
  route: AngularTsCatalogEntry;
  existingParams: Set<string>;
}

export type RouteCompletionContext =
  | RouteNameCompletionContext
  | RouteParamCompletionContext;

export interface ObjectExpressionProperty {
  name: string;
  start: number;
  end: number;
  value: string;
  valueStart: number;
  valueEnd: number;
}

export function routeEntries(
  entries: AngularTsCatalogEntry[],
): AngularTsCatalogEntry[] {
  return entries.filter(
    (entry) => entry.kind === "route" && !entry.routeLazyBoundary,
  );
}

export function routeNameCompletionEntries(
  entries: AngularTsCatalogEntry[],
  prefix: string,
): AngularTsCatalogEntry[] {
  return routeEntries(entries).filter((entry) => entry.name.startsWith(prefix));
}

export function routeParamCompletionNames(
  route: AngularTsCatalogEntry,
  existingParams: Set<string>,
  prefix: string,
): string[] {
  return (route.routeParams ?? [])
    .map((param) => param.name)
    .filter((name) => name.startsWith(prefix))
    .filter((name) => !existingParams.has(name));
}

export function routeMap(
  entries: AngularTsCatalogEntry[],
): Map<string, AngularTsCatalogEntry> {
  return new Map(routeEntries(entries).map((entry) => [entry.name, entry]));
}

export function collectRouteDiagnosticsForElement(
  element: HtmlElement,
  routes: Map<string, AngularTsCatalogEntry>,
): TemplateDiagnostic[] {
  if (!routes.size) return [];

  const stateAttr = element.attributes.find(
    (attribute) => normalizeLookupName(attribute.name) === "ngState",
  );
  if (!stateAttr?.value || stateAttr.valueStart === undefined) return [];

  const literal = parseQuotedStringExpression(stateAttr.value, stateAttr.valueStart);
  if (!literal) return [];

  const route = routes.get(literal.value);
  if (!route) {
    return [
      {
        code: "unknownRoute",
        message: `Unknown AngularTS route '${literal.value}'.`,
        start: literal.start,
        end: literal.end,
        severity: "warning",
      },
    ];
  }

  const params = route.routeParams ?? [];
  if (!params.length) return [];

  const paramsAttr = element.attributes.find(
    (attribute) => normalizeLookupName(attribute.name) === "ngStateParams",
  );
  const providedParams =
    paramsAttr?.value && paramsAttr.valueStart !== undefined
      ? parseObjectExpressionKeys(paramsAttr.value, paramsAttr.valueStart)
      : undefined;
  const providedNames = new Set(providedParams?.map((param) => param.name) ?? []);
  const diagnostics: TemplateDiagnostic[] = [];

  for (const param of params) {
    if (param.optional || providedNames.has(param.name)) continue;

    diagnostics.push({
      code: "missingRouteParam",
      message: `Route '${route.name}' requires ng-state-params key '${param.name}'.`,
      start: stateAttr.start,
      end: stateAttr.end,
      severity: "warning",
    });
  }

  if (!providedParams) return diagnostics;

  const knownParams = new Set(params.map((param) => param.name));
  for (const provided of providedParams) {
    if (knownParams.has(provided.name)) continue;

    diagnostics.push({
      code: "unknownRouteParam",
      message: `Route '${route.name}' does not declare ng-state-params key '${provided.name}'.`,
      start: provided.start,
      end: provided.end,
      severity: "warning",
    });
  }

  return diagnostics;
}

export function routeCompletionContextAtOffset(
  text: string,
  offset: number,
  entries: AngularTsCatalogEntry[],
): RouteCompletionContext | undefined {
  const routes = routeMap(entries);
  if (!routes.size) return undefined;

  const element = scanHtmlElements(text).find(
    (candidate) => candidate.start <= offset && offset <= candidate.end,
  );
  if (!element) return undefined;

  const stateAttr = element.attributes.find(
    (attribute) => normalizeLookupName(attribute.name) === "ngState",
  );
  if (
    stateAttr?.value !== undefined &&
    stateAttr.valueStart !== undefined &&
    stateAttr.valueEnd !== undefined &&
    offset >= stateAttr.valueStart &&
    offset <= stateAttr.valueEnd
  ) {
    return routeNameCompletionContext(
      stateAttr.value,
      stateAttr.valueStart,
      stateAttr.valueEnd,
      offset,
    );
  }

  const paramsAttr = element.attributes.find(
    (attribute) => normalizeLookupName(attribute.name) === "ngStateParams",
  );
  if (
    paramsAttr?.value === undefined ||
    paramsAttr.valueStart === undefined ||
    paramsAttr.valueEnd === undefined ||
    offset < paramsAttr.valueStart ||
    offset > paramsAttr.valueEnd
  ) {
    return undefined;
  }

  if (!stateAttr?.value || stateAttr.valueStart === undefined) return undefined;
  const literal = parseQuotedStringExpression(stateAttr.value, stateAttr.valueStart);
  if (!literal) return undefined;

  const route = routes.get(literal.value);
  if (!route?.routeParams?.length) return undefined;

  const keyContext = objectKeyCompletionContext(
    paramsAttr.value,
    paramsAttr.valueStart,
    offset,
  );
  if (!keyContext) return undefined;

  const existingParams = new Set(
    parseObjectExpressionKeys(paramsAttr.value, paramsAttr.valueStart)
      ?.map((param) => param.name)
      .filter((name) => name !== keyContext.prefix) ?? [],
  );

  return {
    kind: "route-param",
    ...keyContext,
    route,
    existingParams,
  };
}

export function parseQuotedStringExpression(
  value: string,
  valueStart: number,
): { value: string; start: number; end: number } | undefined {
  const outer = value.match(/^\s*(['"`])([^'"`]*)\1?\s*$/);
  if (!outer) return undefined;

  const quoteOffset = value.indexOf(outer[1]);
  const start = valueStart + quoteOffset + 1;
  return {
    value: outer[2],
    start,
    end: start + outer[2].length,
  };
}

export function parseObjectExpressionKeys(
  value: string,
  valueStart: number,
): Array<{ name: string; start: number; end: number }> | undefined {
  return parseObjectExpressionProperties(value, valueStart)?.map((property) => ({
    name: property.name,
    start: property.start,
    end: property.end,
  }));
}

export function parseObjectExpressionProperties(
  value: string,
  valueStart: number,
): ObjectExpressionProperty[] | undefined {
  const open = value.indexOf("{");
  if (open < 0) return undefined;
  const close = findMatchingDelimiter(value, open, "{", "}");
  if (close < 0) return undefined;

  const body = value.slice(open + 1, close);
  const properties: ObjectExpressionProperty[] = [];
  let index = 0;

  while (index < body.length) {
    index = skipWhitespaceAndCommas(body, index);
    const key = readObjectKey(body, index);
    if (!key) {
      index++;
      continue;
    }

    const colon = skipWhitespace(body, key.end);
    if (body[colon] !== ":") {
      index = key.end;
      continue;
    }

    const valueBodyStart = skipWhitespace(body, colon + 1);
    const valueEnd = skipObjectValue(body, valueBodyStart);
    const trimmedValueEnd =
      valueEnd - (body.slice(valueBodyStart, valueEnd).match(/\s*,?\s*$/)?.[0].length ?? 0);

    properties.push({
      name: key.name,
      start: valueStart + open + 1 + key.start,
      end: valueStart + open + 1 + key.end,
      value: body.slice(valueBodyStart, trimmedValueEnd),
      valueStart: valueStart + open + 1 + valueBodyStart,
      valueEnd: valueStart + open + 1 + trimmedValueEnd,
    });
    index = valueEnd;
  }

  return properties;
}

function routeNameCompletionContext(
  value: string,
  valueStart: number,
  valueEnd: number,
  offset: number,
): RouteNameCompletionContext | undefined {
  const leading = /^\s*/.exec(value)?.[0].length ?? 0;
  const quote = value[leading];
  if (quote !== "'" && quote !== '"' && quote !== "`") return undefined;

  const innerStart = valueStart + leading + 1;
  if (offset < innerStart) return undefined;

  const relativeOffset = offset - valueStart;
  const close = findStringEnd(value, leading + 1, quote);
  const innerEnd = close >= 0 ? valueStart + close : valueEnd;
  if (offset > innerEnd) return undefined;

  return {
    kind: "route-name",
    start: innerStart,
    end: innerEnd,
    prefix: value.slice(leading + 1, Math.max(leading + 1, relativeOffset)),
  };
}

function objectKeyCompletionContext(
  value: string,
  valueStart: number,
  offset: number,
): { start: number; end: number; prefix: string } | undefined {
  const open = value.indexOf("{");
  if (open < 0) return undefined;

  const close = findMatchingDelimiter(value, open, "{", "}");
  const bodyEnd = close >= 0 ? close : value.length;
  const relativeOffset = offset - valueStart;
  if (relativeOffset <= open || relativeOffset > bodyEnd) return undefined;

  const body = value.slice(open + 1, bodyEnd);
  const bodyOffset = relativeOffset - open - 1;
  let index = 0;

  while (index <= body.length) {
    index = skipWhitespaceAndCommas(body, index);
    const propertyStart = index;
    const key = readObjectKey(body, index);
    const keyEnd = key?.end ?? index;
    const colon = skipWhitespace(body, keyEnd);

    if (bodyOffset >= propertyStart && bodyOffset <= colon) {
      if (key && bodyOffset > key.end) return undefined;
      const prefixStart = key?.start ?? propertyStart;
      const prefixEnd = Math.max(prefixStart, bodyOffset);
      const absoluteStart = valueStart + open + 1 + prefixStart;
      return {
        start: absoluteStart,
        end: valueStart + open + 1 + prefixEnd,
        prefix: body.slice(prefixStart, prefixEnd),
      };
    }

    if (!key || body[colon] !== ":") {
      if (bodyOffset >= propertyStart && bodyOffset <= index) {
        const absolute = valueStart + open + 1 + propertyStart;
        return { start: absolute, end: absolute, prefix: "" };
      }
      index = Math.max(index + 1, bodyOffset + 1);
      continue;
    }

    index = skipObjectValue(body, colon + 1);
  }

  return undefined;
}

function findStringEnd(text: string, start: number, quote: string): number {
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return index;
    }
  }
  return -1;
}

function skipWhitespaceAndCommas(text: string, index: number): number {
  while (/[\s,]/.test(text[index] ?? "")) index++;
  return index;
}

function skipWhitespace(text: string, index: number): number {
  while (/\s/.test(text[index] ?? "")) index++;
  return index;
}

function readObjectKey(
  text: string,
  index: number,
): { name: string; start: number; end: number } | undefined {
  const quote = text[index];
  if (quote === "'" || quote === '"' || quote === "`") {
    let escaped = false;
    let value = "";

    for (let cursor = index + 1; cursor < text.length; cursor++) {
      const char = text[cursor];
      if (escaped) {
        value += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        return { name: value, start: index + 1, end: cursor };
      }
      value += char;
    }

    return undefined;
  }

  const match = /^[A-Za-z_$][\w$-]*/.exec(text.slice(index));
  if (!match) return undefined;

  return {
    name: match[0],
    start: index,
    end: index + match[0].length,
  };
}

function skipObjectValue(text: string, index: number): number {
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;

  for (let cursor = index; cursor < text.length; cursor++) {
    const char = text[cursor];

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

    if (char === "(" || char === "{" || char === "[") depth++;
    if (char === ")" || char === "}" || char === "]") depth--;
    if (depth <= 0 && char === ",") return cursor + 1;
  }

  return text.length;
}

function findMatchingDelimiter(
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
