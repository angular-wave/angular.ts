import type { AngularTsCatalogEntry, AngularTsExpressionKind } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";
import { scanAngularTsFilterPipes } from "./filters";
import { scanHtmlElements } from "./htmlScanner";

export type AngularTsEmbeddedRegionKind =
  | "interpolation"
  | "directive-expression"
  | "event-statement"
  | "repeat-expression"
  | "options-expression"
  | "object-expression"
  | "filter-expression";

export interface AngularTsEmbeddedRegion {
  kind: AngularTsEmbeddedRegionKind;
  start: number;
  end: number;
  source?: string;
  expressionKind?: AngularTsExpressionKind;
}

export interface AngularTsExpressionRegion extends AngularTsEmbeddedRegion {
  expression: string;
}

export function collectAngularTsEmbeddedRegions(
  text: string,
  entries: AngularTsCatalogEntry[],
): AngularTsEmbeddedRegion[] {
  const elements = scanHtmlElements(text);
  const ignoredRanges = collectNonBindableRanges(text, elements);
  const regions: AngularTsEmbeddedRegion[] = [];

  regions.push(...collectInterpolationRegions(text, ignoredRanges));

  for (const element of elements) {
    if (isOffsetInRanges(element.start, ignoredRanges)) continue;

    for (const attribute of element.attributes) {
      if (
        attribute.value === undefined ||
        attribute.valueStart === undefined ||
        isOffsetInRanges(attribute.start, ignoredRanges)
      ) {
        continue;
      }

      const entry = findEntry(entries, attribute.name);
      if (entry?.kind !== "directive" || entry.expressionKind === "none") {
        continue;
      }

      const kind = embeddedRegionKindFor(entry.expressionKind);
      if (!kind) continue;

      regions.push({
        kind,
        start: attribute.valueStart,
        end: attribute.valueStart + attribute.value.length,
        source: attribute.name,
        expressionKind: entry.expressionKind,
      });

      if (entry.expressionKind === "expression") {
        regions.push(
          ...collectFilterRegions(
            attribute.value,
            attribute.valueStart,
            attribute.name,
          ),
        );
      }
    }
  }

  return regions.sort((left, right) => left.start - right.start || left.end - right.end);
}

export function angularTsExpressionAtOffset(
  text: string,
  offset: number,
  entries: AngularTsCatalogEntry[],
): AngularTsExpressionRegion | undefined {
  const region = collectAngularTsEmbeddedRegions(text, entries)
    .filter((candidate) => candidate.kind !== "filter-expression")
    .find((candidate) => offset >= candidate.start && offset <= candidate.end);
  if (!region) return undefined;

  return {
    ...region,
    expression: text.slice(region.start, region.end),
  };
}

function collectInterpolationRegions(
  text: string,
  ignoredRanges: Array<{ start: number; end: number }>,
): AngularTsEmbeddedRegion[] {
  const regions: AngularTsEmbeddedRegion[] = [];
  const interpolationRe = /\{\{([\s\S]*?)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = interpolationRe.exec(text))) {
    if (isOffsetInRanges(match.index, ignoredRanges)) continue;

    const expression = match[1];
    const expressionStart = match.index + 2;
    regions.push({
      kind: "interpolation",
      start: expressionStart,
      end: expressionStart + expression.length,
      expressionKind: "expression",
    });
    regions.push(...collectFilterRegions(expression, expressionStart, "interpolation"));
  }

  return regions;
}

function collectFilterRegions(
  expression: string,
  expressionStart: number,
  source: string,
): AngularTsEmbeddedRegion[] {
  return scanAngularTsFilterPipes(expression, expressionStart).map((filter) => ({
    kind: "filter-expression",
    start: filter.start,
    end: filter.end,
    source,
    expressionKind: "filter",
  }));
}

function embeddedRegionKindFor(
  expressionKind: AngularTsExpressionKind | undefined,
): AngularTsEmbeddedRegionKind | undefined {
  switch (expressionKind) {
    case "statement":
      return "event-statement";
    case "repeat":
      return "repeat-expression";
    case "options":
      return "options-expression";
    case "json":
      return "object-expression";
    case "expression":
    case "model":
      return "directive-expression";
    default:
      return undefined;
  }
}

function findEntry(
  entries: AngularTsCatalogEntry[],
  name: string,
): AngularTsCatalogEntry | undefined {
  const normalized = normalizeLookupName(name);
  return entries.find((entry) => {
    if (entry.normalizedName === normalized) return true;
    if (entry.htmlName && normalizeLookupName(entry.htmlName) === normalized) {
      return true;
    }
    return entry.aliases.some((alias) => normalizeLookupName(alias) === normalized);
  });
}

function collectNonBindableRanges(
  text: string,
  elements: ReturnType<typeof scanHtmlElements>,
): Array<{ start: number; end: number }> {
  return elements
    .filter((element) =>
      element.attributes.some(
        (attribute) => normalizeLookupName(attribute.name) === "ngNonBindable",
      ),
    )
    .map((element) => ({
      start: element.start,
      end: findElementCloseEnd(text, element) ?? element.end,
    }));
}

function findElementCloseEnd(
  text: string,
  element: ReturnType<typeof scanHtmlElements>[number],
): number | undefined {
  const tagPattern = new RegExp(`<\\s*(/?)\\s*${escapeRegExp(element.tagName)}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = element.start;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(text))) {
    const isClosing = Boolean(match[1]);
    const isSelfClosing = /\/\s*>$/.test(match[0]);

    if (isClosing) {
      depth--;
    } else if (!isSelfClosing) {
      depth++;
    }

    if (depth === 0) return match.index + match[0].length;
  }

  return undefined;
}

function isOffsetInRanges(
  offset: number,
  ranges: Array<{ start: number; end: number }>,
): boolean {
  return ranges.some((range) => range.start <= offset && offset < range.end);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
