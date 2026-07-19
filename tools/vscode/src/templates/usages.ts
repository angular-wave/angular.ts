import type { AngularTsCatalogEntry } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";
import { scanHtmlElements } from "./htmlScanner";
import { scanAngularTsFilterPipes } from "./filters";

export interface AngularTsUsage {
  kind: "element" | "attribute" | "binding" | "filter" | "controller" | "service";
  start: number;
  end: number;
}

export function collectAngularTsUsages(
  text: string,
  languageId: string,
  target: AngularTsCatalogEntry,
): AngularTsUsage[] {
  if (languageId === "html") return collectHtmlUsages(text, target);
  if (
    ["typescript", "javascript", "typescriptreact", "javascriptreact"].includes(
      languageId,
    )
  ) {
    return collectSourceUsages(text, target);
  }
  return [];
}

function collectHtmlUsages(
  text: string,
  target: AngularTsCatalogEntry,
): AngularTsUsage[] {
  const usages: AngularTsUsage[] = [];
  const targetNames = lookupNames(target);

  for (const element of scanHtmlElements(text)) {
    if (isElementUsageTarget(target) && targetNames.has(normalizeLookupName(element.tagName))) {
      usages.push({
        kind: "element",
        start: element.start + elementTextTagNameOffset(text, element.start),
        end: element.start + elementTextTagNameOffset(text, element.start) + element.tagName.length,
      });
    }

    for (const attr of element.attributes) {
      const normalizedAttr = normalizeLookupName(attr.name);

      if (
        target.kind === "directive" &&
        targetNames.has(normalizedAttr)
      ) {
        usages.push({ kind: "attribute", start: attr.start, end: attr.end });
      }

      if (
        (target.kind === "component" || target.kind === "directive") &&
        target.bindings?.some(
          (binding) =>
            normalizeLookupName(binding.name) === normalizedAttr,
        )
      ) {
        usages.push({ kind: "binding", start: attr.start, end: attr.end });
      }

      if (
        target.kind === "controller" &&
        normalizeLookupName(attr.name) === "ngController" &&
        attr.value &&
        attr.valueStart !== undefined
      ) {
        const controller = parseControllerLiteral(attr.value, attr.valueStart);
        if (controller && targetNames.has(normalizeLookupName(controller.name))) {
          usages.push({
            kind: "controller",
            start: controller.start,
            end: controller.end,
          });
        }
      }
    }
  }

  if (target.kind === "filter") {
    usages.push(...collectFilterUsages(text, target));
  }

  return usages;
}

function collectSourceUsages(
  text: string,
  target: AngularTsCatalogEntry,
): AngularTsUsage[] {
  const usages: AngularTsUsage[] = [];
  const targetNames = lookupNames(target);

  if (target.kind === "filter") usages.push(...collectFilterUsages(text, target));
  if (
    target.kind === "directive" ||
    target.kind === "component" ||
    target.kind === "controller"
  ) {
    usages.push(...collectHtmlUsages(text, target));
  }

  const stringRe = /(['"`])([^'"`]*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = stringRe.exec(text))) {
    const value = match[2];
    const valueStart = match.index + 1;

    if (target.kind === "controller" && isControllerPropertyValue(text, match.index)) {
      const controller = parseControllerLiteral(value, valueStart);
      if (controller && targetNames.has(normalizeLookupName(controller.name))) {
        usages.push({
          kind: "controller",
          start: controller.start,
          end: controller.end,
        });
      }
    }

    if (
      isInjectTokenPosition(text, match.index, match.index + match[0].length) &&
      ["service", "factory", "provider", "constant"].includes(target.kind) &&
      targetNames.has(normalizeLookupName(value))
    ) {
      usages.push({
        kind: "service",
        start: valueStart,
        end: valueStart + value.length,
      });
    }
  }

  return usages;
}

function collectFilterUsages(
  text: string,
  target: AngularTsCatalogEntry,
): AngularTsUsage[] {
  const usages: AngularTsUsage[] = [];
  const targetNames = lookupNames(target);
  const interpolationRe = /\{\{([\s\S]*?)\}\}/g;
  let interpolation: RegExpExecArray | null;

  while ((interpolation = interpolationRe.exec(text))) {
    const expression = interpolation[1];
    const expressionStart = interpolation.index + 2;
    for (const filter of scanAngularTsFilterPipes(expression, expressionStart)) {
      const name = filter.name;
      if (!targetNames.has(normalizeLookupName(name))) continue;

      usages.push({ kind: "filter", start: filter.start, end: filter.end });
    }
  }

  return usages;
}

function lookupNames(target: AngularTsCatalogEntry): Set<string> {
  return new Set(
    [target.name, target.normalizedName, target.htmlName, ...target.aliases]
      .filter((value): value is string => Boolean(value))
      .map(normalizeLookupName),
  );
}

function isElementUsageTarget(target: AngularTsCatalogEntry): boolean {
  return (
    target.kind === "component" ||
    (target.kind === "directive" &&
      Boolean(target.allowedLocations?.includes("element")))
  );
}

function parseControllerLiteral(
  value: string,
  valueStart: number,
): { name: string; start: number; end: number } | undefined {
  const match = /^\s*([A-Za-z_$][\w$]*)/.exec(value);
  if (!match) return undefined;

  const start = valueStart + match[0].indexOf(match[1]);
  return {
    name: match[1],
    start,
    end: start + match[1].length,
  };
}

function isControllerPropertyValue(text: string, literalStart: number): boolean {
  const before = text.slice(Math.max(0, literalStart - 80), literalStart);
  return /\bcontroller\s*:\s*$/.test(before);
}

function isInjectTokenPosition(
  text: string,
  literalStart: number,
  literalEnd: number,
): boolean {
  const arrayStart = text.lastIndexOf("[", literalStart);
  if (arrayStart < 0) return false;

  const arrayEnd = text.indexOf("]", literalEnd);
  if (arrayEnd < 0) return false;

  const beforeArray = text.slice(Math.max(0, arrayStart - 80), arrayStart);
  if (/\.\$inject\s*=\s*$/.test(beforeArray)) return true;

  const after = text.slice(literalEnd, arrayEnd);
  return /\bfunction\b|=>/.test(after);
}

function elementTextTagNameOffset(text: string, elementStart: number): number {
  const slice = text.slice(elementStart);
  const match = /^<\s*/.exec(slice);
  return match?.[0].length ?? 1;
}
