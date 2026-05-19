import type { AngularTsCatalogEntry } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";
import { scanHtmlElements } from "./htmlScanner";

export interface TemplateDiagnostic {
  code: string;
  message: string;
  start: number;
  end: number;
  severity: "warning" | "error";
}

export function collectAngularTsHtmlDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
): TemplateDiagnostic[] {
  const diagnostics: TemplateDiagnostic[] = [];
  const elements = scanHtmlElements(text);
  const filters = new Set(
    entries
      .filter((entry) => entry.kind === "filter")
      .map((entry) => normalizeLookupName(entry.name)),
  );
  const controllers = new Set(
    entries
      .filter((entry) => entry.kind === "controller")
      .map((entry) => normalizeLookupName(entry.name)),
  );

  diagnostics.push(...collectFilterDiagnostics(text, filters));

  for (const element of elements) {
    const elementEntry = findEntry(entries, element.tagName);
    const component = elementEntry?.kind === "component" ? elementEntry : undefined;
    if (
      elementEntry?.kind === "directive" &&
      !elementEntry.allowedLocations?.includes("element")
    ) {
      const tagNameStart = element.start + elementTextTagNameOffset(text, element.start);
      diagnostics.push({
        code: "invalidDirectiveLocation",
        message: `AngularTS directive '${element.tagName}' cannot be used as an element.`,
        start: tagNameStart,
        end: tagNameStart + element.tagName.length,
        severity: "warning",
      });
    }

    const componentBindings = new Set(
      component?.kind === "component"
        ? component.bindings?.map((binding) => normalizeLookupName(binding.name))
        : [],
    );

    for (const attr of element.attributes) {
      const normalized = normalizeLookupName(attr.name);
      const known = findEntry(entries, attr.name);
      if (
        known?.kind === "directive" &&
        !known.allowedLocations?.includes("attribute")
      ) {
        diagnostics.push({
          code: "invalidDirectiveLocation",
          message: `AngularTS directive '${attr.name}' cannot be used as an attribute.`,
          start: attr.start,
          end: attr.end,
          severity: "warning",
        });
        continue;
      }

      if (isAngularTsDirectiveAttribute(attr.name) && !known) {
        diagnostics.push({
          code: "unknownDirective",
          message: `Unknown AngularTS directive '${attr.name}'.`,
          start: attr.start,
          end: attr.end,
          severity: "warning",
        });
        continue;
      }

      if (
        normalizeLookupName(attr.name) === "ngController" &&
        attr.value &&
        attr.valueStart !== undefined &&
        controllers.size > 0
      ) {
        const controller = parseControllerLiteral(attr.value, attr.valueStart);
        if (controller && !controllers.has(normalizeLookupName(controller.name))) {
          diagnostics.push({
            code: "unknownController",
            message: `Unknown AngularTS controller '${controller.name}'.`,
            start: controller.start,
            end: controller.end,
            severity: "warning",
          });
        }
      }

      if (
        component?.kind === "component" &&
        isLikelyBindingAttribute(attr.name) &&
        !known &&
        componentBindings.size > 0 &&
        !componentBindings.has(normalized)
      ) {
        diagnostics.push({
          code: "unknownBinding",
          message: `Unknown binding '${attr.name}' for component <${element.tagName}>.`,
          start: attr.start,
          end: attr.end,
          severity: "warning",
        });
      }
    }
  }

  return diagnostics;
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

function collectFilterDiagnostics(
  text: string,
  filters: Set<string>,
): TemplateDiagnostic[] {
  if (!filters.size) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  const interpolationRe = /\{\{([\s\S]*?)\}\}/g;
  let interpolation: RegExpExecArray | null;

  while ((interpolation = interpolationRe.exec(text))) {
    const expression = interpolation[1];
    const expressionStart = interpolation.index + 2;
    const filterRe = /\|\s*([A-Za-z_$][\w$]*)/g;
    let filterMatch: RegExpExecArray | null;

    while ((filterMatch = filterRe.exec(expression))) {
      const filterName = filterMatch[1];
      if (filters.has(normalizeLookupName(filterName))) continue;

      const start = expressionStart + filterMatch.index + filterMatch[0].lastIndexOf(filterName);
      diagnostics.push({
        code: "unknownFilter",
        message: `Unknown AngularTS filter '${filterName}'.`,
        start,
        end: start + filterName.length,
        severity: "warning",
      });
    }
  }

  return diagnostics;
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

function isAngularTsDirectiveAttribute(name: string): boolean {
  return /^(?:data-)?ng[-_:]/i.test(name);
}

function isLikelyBindingAttribute(name: string): boolean {
  return !name.startsWith("data-") && !name.startsWith("aria-") && !name.includes(":");
}

function elementTextTagNameOffset(text: string, elementStart: number): number {
  const slice = text.slice(elementStart);
  const match = /^<\s*/.exec(slice);
  return match?.[0].length ?? 1;
}
