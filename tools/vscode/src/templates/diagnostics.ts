import type { AngularTsCatalogEntry } from "../catalog/types";
import { directiveAttributeHtmlName, normalizeLookupName } from "../catalog/names";
import { scanHtmlElements } from "./htmlScanner";
import { scanAngularTsFilterPipes } from "./filters";
import { findExpressionSyntaxIssue } from "./expressionDiagnostics";
import { collectRouteDiagnosticsForElement, routeMap } from "./routes";

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
  const ignoredRanges = collectNonBindableRanges(text, elements);
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
  const routes = routeMap(entries);

  diagnostics.push(...collectFilterDiagnostics(text, filters, ignoredRanges));
  diagnostics.push(...collectInterpolationSyntaxDiagnostics(text, ignoredRanges));

  for (const element of elements) {
    if (isOffsetInRanges(element.start, ignoredRanges)) continue;

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

      if (known?.kind === "directive") {
        const htmlName = directiveAttributeHtmlName(attr.name);
        if (/[A-Z]/.test(attr.name) && htmlName !== attr.name) {
          diagnostics.push({
            code: "camelCaseDirectiveAttribute",
            message: `Use '${htmlName}' instead of camelCase AngularTS directive '${attr.name}'.`,
            start: attr.start,
            end: attr.end,
            severity: "warning",
          });
        }
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
        known?.kind === "directive" &&
        known.valueRequired === true &&
        (!attr.value || attr.value.trim() === "")
      ) {
        diagnostics.push({
          code: "missingDirectiveValue",
          message: `AngularTS directive '${attr.name}' requires an expression value.`,
          start: attr.start,
          end: attr.end,
          severity: "warning",
        });
      }

      if (
        known?.kind === "directive" &&
        known.valueRequired === true &&
        attr.value &&
        attr.valueStart !== undefined
      ) {
        const issue = findExpressionSyntaxIssue(attr.value);
        if (issue) {
          diagnostics.push({
            code: "malformedDirectiveExpression",
            message: `Malformed AngularTS expression in '${attr.name}': ${issue.message}`,
            start: attr.valueStart + issue.start,
            end: attr.valueStart + issue.end,
            severity: "warning",
          });
        }
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

    diagnostics.push(...collectRouteDiagnosticsForElement(element, routes));
  }

  return diagnostics;
}

function collectInterpolationSyntaxDiagnostics(
  text: string,
  ignoredRanges: Array<{ start: number; end: number }> = [],
): TemplateDiagnostic[] {
  const diagnostics: TemplateDiagnostic[] = [];
  let searchStart = 0;

  while (searchStart < text.length) {
    const interpolationStart = text.indexOf("{{", searchStart);
    if (interpolationStart < 0) break;
    if (isOffsetInRanges(interpolationStart, ignoredRanges)) {
      searchStart = interpolationStart + 2;
      continue;
    }

    const interpolationEnd = text.indexOf("}}", interpolationStart + 2);
    if (interpolationEnd < 0) {
      diagnostics.push({
        code: "malformedInterpolationExpression",
        message: "Malformed AngularTS interpolation: missing closing '}}'.",
        start: interpolationStart,
        end: Math.min(text.length, interpolationStart + 2),
        severity: "warning",
      });
      break;
    }

    const expressionStart = interpolationStart + 2;
    const expression = text.slice(expressionStart, interpolationEnd);
    const issue = findExpressionSyntaxIssue(expression);
    if (issue) {
      diagnostics.push({
        code: "malformedInterpolationExpression",
        message: `Malformed AngularTS interpolation: ${issue.message}`,
        start: expressionStart + issue.start,
        end: expressionStart + issue.end,
        severity: "warning",
      });
    }

    searchStart = interpolationEnd + 2;
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
  ignoredRanges: Array<{ start: number; end: number }> = [],
): TemplateDiagnostic[] {
  if (!filters.size) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  const interpolationRe = /\{\{([\s\S]*?)\}\}/g;
  let interpolation: RegExpExecArray | null;

  while ((interpolation = interpolationRe.exec(text))) {
    if (isOffsetInRanges(interpolation.index, ignoredRanges)) continue;

    const expression = interpolation[1];
    const expressionStart = interpolation.index + 2;
    for (const filter of scanAngularTsFilterPipes(expression, expressionStart)) {
      const filterName = filter.name;
      if (filters.has(normalizeLookupName(filterName))) continue;

      diagnostics.push({
        code: "unknownFilter",
        message: `Unknown AngularTS filter '${filterName}'.`,
        start: filter.start,
        end: filter.end,
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
