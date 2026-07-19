import type { TemplateDiagnostic } from "./diagnostics";
import { collectAngularTsHtmlDiagnostics } from "./diagnostics";
import type { AngularTsCatalogEntry } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";
import { scanHtmlElements } from "./htmlScanner";
import {
  parseObjectExpressionProperties,
  parseQuotedStringExpression,
  routeMap,
} from "./routes";
import { TypeScriptExpressionService, type TypeScriptExpressionLocal } from "./typescriptExpressions";
import * as fs from "node:fs";
import * as path from "node:path";

export function collectAngularTsSourceDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[] = [],
  filePath?: string,
): TemplateDiagnostic[] {
  return [
    ...collectDiArrayDiagnostics(text, entries),
    ...collectInjectAssignmentDiagnostics(text, entries),
    ...collectControllerReferenceDiagnostics(text, entries),
    ...collectTemplateUrlDiagnostics(text, filePath),
    ...collectRouteTreeDiagnostics(text, entries, filePath),
    ...collectRouteComponentBindingDiagnostics(text, entries, filePath),
    ...collectInlineTemplateRouteDiagnostics(text, entries),
    ...collectTemplateUrlRouteDiagnostics(text, entries, filePath),
  ];
}

function injectableNameSet(entries: AngularTsCatalogEntry[]): Set<string> {
  return new Set(
    entries
      .filter((entry) =>
        ["service", "factory", "provider", "constant"].includes(entry.kind),
      )
      .flatMap((entry) => [entry.name, ...entry.aliases])
      .map(normalizeLookupName),
  );
}

function collectControllerReferenceDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
): TemplateDiagnostic[] {
  const controllers = new Set(
    entries
      .filter((entry) => entry.kind === "controller")
      .map((entry) => normalizeLookupName(entry.name)),
  );
  if (!controllers.size) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  const controllerRe = /\bcontroller\s*:\s*(['"`])([^'"`]+)\1/g;
  let match: RegExpExecArray | null;

  while ((match = controllerRe.exec(text))) {
    const value = match[2];
    const valueStart = match.index + match[0].indexOf(value);
    const controller = parseControllerLiteral(value, valueStart);
    if (!controller || controllers.has(normalizeLookupName(controller.name))) {
      continue;
    }

    diagnostics.push({
      code: "unknownController",
      message: `Unknown AngularTS controller '${controller.name}'.`,
      start: controller.start,
      end: controller.end,
      severity: "warning",
    });
  }

  return diagnostics;
}

function collectTemplateUrlDiagnostics(
  text: string,
  filePath: string | undefined,
): TemplateDiagnostic[] {
  if (!filePath) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  const templateUrlRe = /\btemplateUrl\s*:\s*(['"`])([^'"`]+)\1/g;
  let match: RegExpExecArray | null;

  while ((match = templateUrlRe.exec(text))) {
    const templatePath = match[2];
    if (/^[a-z]+:/i.test(templatePath)) continue;

    const resolved = path.resolve(path.dirname(filePath), templatePath);
    if (fs.existsSync(resolved)) continue;

    const start = match.index + match[0].indexOf(templatePath);
    diagnostics.push({
      code: "missingTemplateUrl",
      message: `Template file '${templatePath}' does not exist.`,
      start,
      end: start + templatePath.length,
      severity: "warning",
    });
  }

  return diagnostics;
}

function collectRouteComponentBindingDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
  filePath: string | undefined,
): TemplateDiagnostic[] {
  const components = new Map(
    entries
      .filter((entry) => entry.kind === "component")
      .map((entry) => [entry.name, entry]),
  );
  if (!components.size) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  for (const route of entries.filter((entry) => entry.kind === "route")) {
    if (!route.routeComponent || !entryBelongsToFile(route, filePath)) continue;

    const component = components.get(route.routeComponent.name);
    if (!component?.bindings?.length) continue;

    const resolves = route.routeResolves ?? [];
    const resolveNames = new Set(resolves.map((resolve) => resolve.name));
    const bindingNames = new Set(component.bindings.map((binding) => binding.name));

    for (const binding of component.bindings) {
      if (
        binding.optional ||
        binding.mode === "&" ||
        resolveNames.has(binding.name)
      ) {
        continue;
      }

      const start = route.routeComponent.sourceOffset ?? route.source?.character ?? 0;
      diagnostics.push({
        code: "missingRouteResolveBinding",
        message: `Route '${route.name}' renders component '${component.name}', but required binding '${binding.name}' is not supplied by route resolves.`,
        start,
        end: Math.min(text.length, start + route.routeComponent.name.length),
        severity: "warning",
      });
    }

    for (const resolve of resolves) {
      if (bindingNames.has(resolve.name)) continue;

      const start = resolve.sourceOffset ?? route.routeComponent.sourceOffset ?? 0;
      diagnostics.push({
        code: "unknownRouteResolveBinding",
        message: `Route '${route.name}' resolve '${resolve.name}' does not match a binding on component '${component.name}'.`,
        start,
        end: Math.min(text.length, start + resolve.name.length),
        severity: "warning",
      });
    }

    for (const resolve of resolves) {
      const binding = component.bindings.find(
        (candidate) => candidate.name === resolve.name,
      );
      if (!binding || binding.mode === "&" || !resolve.value) continue;

      const targetType = componentBindingTargetType(component, binding.name);
      if (!targetType) continue;

      const service = new TypeScriptExpressionService(resolve.value, {
        declarations: text,
      });
      if (
        !service.canUseType(targetType) ||
        service.isResolvedValueAssignableTo(targetType)
      ) {
        continue;
      }

      const start = resolve.valueStart ?? resolve.sourceOffset ?? 0;
      const end = resolve.valueEnd ?? start + resolve.value.length;
      diagnostics.push({
        code: "routeResolveTypeMismatch",
        message: `Route '${route.name}' resolve '${resolve.name}' is not assignable to component '${component.name}' binding '${binding.name}'.`,
        start,
        end: Math.min(text.length, end),
        severity: "warning",
      });
    }
  }

  return diagnostics;
}

function componentBindingTargetType(
  component: AngularTsCatalogEntry,
  bindingName: string,
): string | undefined {
  const controller = component.controller;
  if (!controller || !/^[A-Za-z_$][\w$]*$/.test(controller)) return undefined;

  return `${controller}[${JSON.stringify(bindingName)}]`;
}

function collectRouteTreeDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
  filePath: string | undefined,
): TemplateDiagnostic[] {
  const routeEntries = entries.filter((entry) => entry.kind === "route");
  const routes = routeEntries.filter((entry) => !entry.routeLazyBoundary);
  const lazyBoundaries = new Set(
    routeEntries
      .filter((entry) => entry.routeLazyBoundary)
      .map((entry) => entry.name),
  );
  if (!routes.length) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  const allRouteNames = new Set(routes.map((route) => route.name));
  const byName = new Map<string, AngularTsCatalogEntry[]>();
  for (const route of routes) {
    const bucket = byName.get(route.name) ?? [];
    bucket.push(route);
    byName.set(route.name, bucket);
  }

  for (const [name, bucket] of byName) {
    if (bucket.length < 2) continue;

    for (const duplicate of bucket.slice(1)) {
      if (!entryBelongsToFile(duplicate, filePath) || entryOffset(duplicate) < 0) {
        continue;
      }
      const start = entryOffset(duplicate);
      diagnostics.push({
        code: "duplicateRoute",
        message: `Duplicate AngularTS route '${name}'.`,
        start,
        end: Math.min(text.length, start + name.length),
        severity: "warning",
      });
    }
  }

  for (const route of routes) {
    if (!entryBelongsToFile(route, filePath) || entryOffset(route) < 0) continue;
    const parent = route.name.includes(".")
      ? route.name.slice(0, route.name.lastIndexOf("."))
      : undefined;
    if (
      !parent ||
      allRouteNames.has(parent) ||
      hasLazyRoutePrefix(lazyBoundaries, parent)
    ) {
      continue;
    }

    const start = entryOffset(route);
    diagnostics.push({
      code: "orphanRoute",
      message: `Route '${route.name}' has no registered parent route '${parent}'.`,
      start,
      end: Math.min(text.length, start + route.name.length),
      severity: "warning",
    });
  }

  return diagnostics;
}

function hasLazyRoutePrefix(lazyBoundaries: Set<string>, parent: string): boolean {
  for (const boundary of lazyBoundaries) {
    if (!boundary.endsWith(".**")) continue;
    const namespace = boundary.slice(0, -3);
    if (parent === namespace || parent.startsWith(`${namespace}.`)) {
      return true;
    }
  }
  return false;
}

function entryOffset(entry: AngularTsCatalogEntry): number {
  return (entry as AngularTsCatalogEntry & { offset?: number }).offset ?? -1;
}

function entryBelongsToFile(
  entry: AngularTsCatalogEntry,
  filePath: string | undefined,
): boolean {
  if (!filePath || !entry.source?.file) return true;
  return path.resolve(entry.source.file) === path.resolve(filePath);
}

function collectInlineTemplateRouteDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
): TemplateDiagnostic[] {
  if (!entries.some((entry) => entry.kind === "route")) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  for (const template of scanStringPropertyValues(text, "template")) {
    const locals = componentControllerLocalsAtProperty(text, template.propertyStart);
    diagnostics.push(
      ...collectAngularTsHtmlDiagnostics(template.value, entries)
        .filter(isRouteDiagnostic)
        .map((diagnostic) => ({
          ...diagnostic,
          start: template.valueStart + diagnostic.start,
          end: template.valueStart + diagnostic.end,
        })),
      ...collectDynamicRouteDiagnostics(
        template.value,
        template.valueStart,
        text,
        locals,
        entries,
      ),
      ...collectRouteParamValueDiagnostics(
        template.value,
        template.valueStart,
        text,
        locals,
        entries,
      ),
    );
  }

  return diagnostics;
}

function collectTemplateUrlRouteDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
  filePath: string | undefined,
): TemplateDiagnostic[] {
  if (!filePath || !entries.some((entry) => entry.kind === "route")) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  for (const templateUrl of scanStringPropertyValues(text, "templateUrl")) {
    if (/^[a-z]+:/i.test(templateUrl.value)) continue;

    const resolved = path.resolve(path.dirname(filePath), templateUrl.value);
    if (!fs.existsSync(resolved)) continue;

    const template = fs.readFileSync(resolved, "utf8");
    const locals = componentControllerLocalsAtProperty(text, templateUrl.propertyStart);
    diagnostics.push(
      ...collectAngularTsHtmlDiagnostics(template, entries)
        .filter(isRouteDiagnostic)
        .map((diagnostic) => ({
          ...diagnostic,
          message: `Template '${templateUrl.value}' contains: ${diagnostic.message}`,
          start: templateUrl.valueStart,
          end: templateUrl.valueEnd,
        })),
      ...collectDynamicRouteDiagnostics(
        template,
        templateUrl.valueStart,
        text,
        locals,
        entries,
        templateUrl.value,
      ).map((diagnostic) => ({
        ...diagnostic,
        start: templateUrl.valueStart,
        end: templateUrl.valueEnd,
      })),
      ...collectRouteParamValueDiagnostics(
        template,
        templateUrl.valueStart,
        text,
        locals,
        entries,
        templateUrl.value,
      ).map((diagnostic) => ({
        ...diagnostic,
        start: templateUrl.valueStart,
        end: templateUrl.valueEnd,
      })),
    );
  }

  return diagnostics;
}

function scanStringPropertyValues(
  text: string,
  propertyName: string,
): Array<{
  propertyStart: number;
  value: string;
  valueStart: number;
  valueEnd: number;
}> {
  const values: Array<{
    propertyStart: number;
    value: string;
    valueStart: number;
    valueEnd: number;
  }> = [];
  const propertyRe = new RegExp(`\\b${propertyName}\\s*:\\s*(['"\`])`, "g");
  let match: RegExpExecArray | null;

  while ((match = propertyRe.exec(text))) {
    const quote = match[1];
    const valueStart = match.index + match[0].length;
    const valueEnd = findStringEnd(text, valueStart, quote);
    if (valueEnd < 0) break;

    values.push({
      propertyStart: match.index,
      value: text.slice(valueStart, valueEnd),
      valueStart,
      valueEnd,
    });
    propertyRe.lastIndex = valueEnd + 1;
  }

  return values;
}

function collectDynamicRouteDiagnostics(
  template: string,
  templateOffset: number,
  sourceText: string,
  locals: TypeScriptExpressionLocal[],
  entries: AngularTsCatalogEntry[],
  templateName?: string,
): TemplateDiagnostic[] {
  const routes = routeMap(entries);
  if (!routes.size) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  for (const element of scanHtmlElements(template)) {
    const stateAttr = element.attributes.find(
      (attribute) => normalizeLookupName(attribute.name) === "ngState",
    );
    if (
      stateAttr?.value === undefined ||
      stateAttr.valueStart === undefined ||
      parseQuotedStringExpression(stateAttr.value, stateAttr.valueStart)
    ) {
      continue;
    }

    const expressionOffset = routeExpressionTypeOffset(stateAttr.value);
    if (expressionOffset === undefined) continue;

    const service = new TypeScriptExpressionService(stateAttr.value, {
      declarations: sourceText,
      locals,
    });
    const union = service.stringLiteralUnion(expressionOffset);
    if (!union?.values.length) continue;

    const missing = union.values.filter((route) => !routes.has(route));
    if (!missing.length) continue;

    const message =
      missing.length === 1
        ? `Dynamic ng-state expression can resolve to unknown AngularTS route '${missing[0]}'.`
        : `Dynamic ng-state expression can resolve to unknown AngularTS routes ${missing
            .map((route) => `'${route}'`)
            .join(", ")}.`;

    diagnostics.push({
      code: "unknownRoute",
      message: templateName ? `Template '${templateName}' contains: ${message}` : message,
      start: templateOffset + stateAttr.valueStart,
      end: templateOffset + (stateAttr.valueEnd ?? stateAttr.valueStart + stateAttr.value.length),
      severity: "warning",
    });
  }

  return diagnostics;
}

function collectRouteParamValueDiagnostics(
  template: string,
  templateOffset: number,
  sourceText: string,
  locals: TypeScriptExpressionLocal[],
  entries: AngularTsCatalogEntry[],
  templateName?: string,
): TemplateDiagnostic[] {
  const routes = routeMap(entries);
  if (!routes.size) return [];

  const diagnostics: TemplateDiagnostic[] = [];
  for (const element of scanHtmlElements(template)) {
    const stateAttr = element.attributes.find(
      (attribute) => normalizeLookupName(attribute.name) === "ngState",
    );
    if (!stateAttr?.value || stateAttr.valueStart === undefined) continue;

    const target = routeTargetsForStateAttribute(
      stateAttr.value,
      stateAttr.valueStart,
      routes,
      sourceText,
      locals,
    );
    if (!target?.routes.length) continue;

    const paramsAttr = element.attributes.find(
      (attribute) => normalizeLookupName(attribute.name) === "ngStateParams",
    );
    const properties =
      paramsAttr?.value && paramsAttr.valueStart !== undefined
        ? parseObjectExpressionProperties(paramsAttr.value, paramsAttr.valueStart)
        : undefined;
    const providedNames = new Set(properties?.map((property) => property.name) ?? []);

    if (target.dynamic) {
      for (const param of requiredByEveryRoute(target.routes)) {
        if (providedNames.has(param.name)) continue;

        const message = `Dynamic ng-state route requires ng-state-params key '${param.name}' for every possible target.`;
        diagnostics.push({
          code: "missingRouteParam",
          message: templateName ? `Template '${templateName}' contains: ${message}` : message,
          start: templateOffset + stateAttr.start,
          end: templateOffset + stateAttr.end,
          severity: "warning",
        });
      }

      if (properties?.length) {
        const knownParams = new Set(
          target.routes.flatMap((route) =>
            (route.routeParams ?? []).map((param) => param.name),
          ),
        );

        for (const property of properties) {
          if (knownParams.has(property.name)) continue;

          const message = `Dynamic ng-state route does not declare ng-state-params key '${property.name}' on any possible target.`;
          diagnostics.push({
            code: "unknownRouteParam",
            message: templateName
              ? `Template '${templateName}' contains: ${message}`
              : message,
            start: templateOffset + property.start,
            end: templateOffset + property.end,
            severity: "warning",
          });
        }
      }
    }

    const typedParams = agreedRouteParamTypes(target.routes);
    if (!typedParams.size) continue;

    if (!properties?.length) continue;

    for (const property of properties) {
      const expectedType = typedParams.get(property.name);
      if (!expectedType) continue;

      const service = new TypeScriptExpressionService(property.value, {
        declarations: sourceText,
        locals,
      });
      if (service.isAssignableTo(expectedType)) continue;

      const message = target.dynamic
        ? `Dynamic ng-state route parameter '${property.name}' expects ${expectedType} for every typed target, but the supplied expression is not assignable.`
        : `Route '${target.routes[0]?.name ?? target.label}' parameter '${property.name}' expects ${expectedType}, but the supplied expression is not assignable.`;
      diagnostics.push({
        code: "routeParamTypeMismatch",
        message: templateName ? `Template '${templateName}' contains: ${message}` : message,
        start: templateOffset + property.valueStart,
        end: templateOffset + property.valueEnd,
        severity: "warning",
      });
    }
  }

  return diagnostics;
}

function routeTargetsForStateAttribute(
  value: string,
  valueStart: number,
  routes: Map<string, AngularTsCatalogEntry>,
  sourceText: string,
  locals: TypeScriptExpressionLocal[],
):
  | {
      dynamic: boolean;
      label: string;
      routes: AngularTsCatalogEntry[];
    }
  | undefined {
  const literal = parseQuotedStringExpression(value, valueStart);
  if (literal) {
    const route = routes.get(literal.value);
    return route
      ? {
          dynamic: false,
          label: literal.value,
          routes: [route],
        }
      : undefined;
  }

  const expressionOffset = routeExpressionTypeOffset(value);
  if (expressionOffset === undefined) return undefined;

  const service = new TypeScriptExpressionService(value, {
    declarations: sourceText,
    locals,
  });
  const union = service.stringLiteralUnion(expressionOffset);
  if (!union?.values.length) return undefined;

  return {
    dynamic: true,
    label: union.values.join(" | "),
    routes: union.values
      .map((routeName) => routes.get(routeName))
      .filter((route): route is AngularTsCatalogEntry => route !== undefined),
  };
}

function requiredByEveryRoute(
  routes: AngularTsCatalogEntry[],
): Array<{ name: string }> {
  if (!routes.length) return [];

  const required = new Map<string, number>();
  for (const route of routes) {
    const seen = new Set<string>();
    for (const param of route.routeParams ?? []) {
      if (param.optional || seen.has(param.name)) continue;
      seen.add(param.name);
      required.set(param.name, (required.get(param.name) ?? 0) + 1);
    }
  }

  return [...required]
    .filter(([, count]) => count === routes.length)
    .map(([name]) => ({ name }));
}

function agreedRouteParamTypes(
  routes: AngularTsCatalogEntry[],
): Map<string, string> {
  const paramTypes = new Map<string, Set<string>>();
  const routeCounts = new Map<string, number>();

  for (const route of routes) {
    const seen = new Set<string>();
    for (const param of route.routeParams ?? []) {
      if (!param.valueType || seen.has(param.name)) continue;
      seen.add(param.name);

      const types = paramTypes.get(param.name) ?? new Set<string>();
      types.add(param.valueType);
      paramTypes.set(param.name, types);
      routeCounts.set(param.name, (routeCounts.get(param.name) ?? 0) + 1);
    }
  }

  const agreed = new Map<string, string>();
  for (const [name, types] of paramTypes) {
    if (types.size !== 1 || routeCounts.get(name) !== routes.length) continue;
    agreed.set(name, [...types][0] ?? "unknown");
  }

  return agreed;
}

function routeExpressionTypeOffset(expression: string): number | undefined {
  const match = /[$A-Za-z_][$\w]*(?:\s*\.\s*[$A-Za-z_][$\w]*)*\s*$/.exec(
    expression,
  );
  if (!match) return undefined;

  const identifier = /[$A-Za-z_][$\w]*\s*$/.exec(match[0]);
  if (!identifier) return undefined;

  return match.index + match[0].lastIndexOf(identifier[0].trim());
}

function componentControllerLocalsAtProperty(
  text: string,
  propertyStart: number,
): TypeScriptExpressionLocal[] {
  const componentStart = text.lastIndexOf(".component", propertyStart);
  if (componentStart < 0) return [];

  const open = text.indexOf("(", componentStart);
  if (open < 0 || open > propertyStart) return [];

  const close = findMatchingDelimiter(text, open, "(", ")");
  if (close < 0 || close < propertyStart) return [];

  const callText = text.slice(componentStart, close + 1);
  const controller = parseControllerName(callText);
  if (!controller) return [];

  return [
    {
      name: parseControllerAs(callText) ?? "$ctrl",
      type: controller,
    },
  ];
}

function parseControllerName(callText: string): string | undefined {
  const stringController = /\bcontroller\s*:\s*(['"`])([^'"`]+)\1/.exec(callText);
  if (stringController) {
    const match = /^\s*([A-Za-z_$][\w$]*)/.exec(stringController[2]);
    return match?.[1];
  }

  const functionController =
    /\bcontroller\s*:\s*(?:async\s*)?function\s+([A-Za-z_$][\w$]*)/.exec(callText);
  if (functionController) return functionController[1];

  return /\bcontroller\s*:\s*([A-Za-z_$][\w$]*)/.exec(callText)?.[1];
}

function parseControllerAs(callText: string): string | undefined {
  const controllerAs = /\bcontrollerAs\s*:\s*(['"`])([^'"`]+)\1/.exec(callText);
  if (controllerAs) return controllerAs[2];

  const stringController = /\bcontroller\s*:\s*(['"`])([^'"`]+)\1/.exec(callText);
  if (!stringController) return undefined;

  return /^\s*[A-Za-z_$][\w$]*\s+as\s+([A-Za-z_$][\w$]*)/.exec(
    stringController[2],
  )?.[1];
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

function isRouteDiagnostic(diagnostic: TemplateDiagnostic): boolean {
  return (
    diagnostic.code === "unknownRoute" ||
    diagnostic.code === "missingRouteParam" ||
    diagnostic.code === "unknownRouteParam"
  );
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

function collectDiArrayDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
): TemplateDiagnostic[] {
  const diagnostics: TemplateDiagnostic[] = [];
  const arrayRe = /\[((?:\s*(['"`])[^'"`]*\2\s*,)+)\s*function\s*\(([^)]*)\)/g;
  const injectableNames = injectableNameSet(entries);
  let match: RegExpExecArray | null;

  while ((match = arrayRe.exec(text))) {
    const tokenText = match[1];
    const paramsText = match[3];
    const tokens = parseStringTokens(tokenText, match.index + 1);
    const params = parseParams(paramsText);
    if (!tokens.length) continue;

    if (tokens.length !== params.length) {
      diagnostics.push({
        code: "diArityMismatch",
        message: `Dependency injection array has ${tokens.length} token(s), but the function declares ${params.length} parameter(s).`,
        start: match.index,
        end: match.index + match[0].length,
        severity: "warning",
      });
    }

    if (!injectableNames.size) continue;

    for (const token of tokens) {
      if (injectableNames.has(normalizeLookupName(token.name))) continue;

      diagnostics.push({
        code: "unknownDiToken",
        message: `Unknown AngularTS dependency injection token '${token.name}'.`,
        start: token.start,
        end: token.end,
        severity: "warning",
      });
    }
  }

  return diagnostics;
}

function collectInjectAssignmentDiagnostics(
  text: string,
  entries: AngularTsCatalogEntry[],
): TemplateDiagnostic[] {
  const diagnostics: TemplateDiagnostic[] = [];
  const injectableNames = injectableNameSet(entries);
  if (!injectableNames.size) return diagnostics;

  const injectRe = /\.\$inject\s*=\s*\[([\s\S]*?)\]/g;
  let match: RegExpExecArray | null;

  while ((match = injectRe.exec(text))) {
    const body = match[1];
    const tokens = parseStringTokens(body, match.index + match[0].indexOf(body));

    for (const token of tokens) {
      if (injectableNames.has(normalizeLookupName(token.name))) continue;

      diagnostics.push({
        code: "unknownDiToken",
        message: `Unknown AngularTS dependency injection token '${token.name}'.`,
        start: token.start,
        end: token.end,
        severity: "warning",
      });
    }
  }

  return diagnostics;
}

function parseStringTokens(
  text: string,
  offset: number,
): Array<{ name: string; start: number; end: number }> {
  const tokens: Array<{ name: string; start: number; end: number }> = [];
  const stringRe = /(['"`])([^'"`]*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = stringRe.exec(text))) {
    const start = offset + match.index + 1;
    tokens.push({
      name: match[2],
      start,
      end: start + match[2].length,
    });
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
