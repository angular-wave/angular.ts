import type { TypeScriptExpressionLocal } from "./typescriptExpressions";
import { scanHtmlElements } from "./htmlScanner";
import { normalizeLookupName } from "../catalog/names";

export interface AngularTsScopeSymbol extends TypeScriptExpressionLocal {
  kind: "controller" | "repeat";
  start: number;
  end: number;
}

export interface ControllerAliasSymbol extends AngularTsScopeSymbol {
  kind: "controller";
  controller: string;
}

export interface RepeatLocalSymbol extends AngularTsScopeSymbol {
  kind: "repeat";
  collection: string;
}

export function scopeSymbolsAtOffset(
  text: string,
  offset: number,
): AngularTsScopeSymbol[] {
  return [
    ...componentTemplateSymbolsAtOffset(text, offset),
    ...scanHtmlElements(text)
      .filter((element) => element.start <= offset)
      .flatMap((element) => {
        const closeEnd = findElementCloseEnd(text, element);
        if (closeEnd !== undefined && offset > closeEnd) return [];

        const symbols: AngularTsScopeSymbol[] = [];
        const controllerAttr = element.attributes.find(
          (attribute) => normalizeLookupName(attribute.name) === "ngController",
        );

        if (controllerAttr?.value !== undefined && controllerAttr.valueStart !== undefined) {
          const parsed = parseControllerAlias(
            controllerAttr.value,
            controllerAttr.valueStart,
          );
          if (parsed) symbols.push(parsed);
        }

        const repeatAttr = element.attributes.find(
          (attribute) => normalizeLookupName(attribute.name) === "ngRepeat",
        );
        if (repeatAttr?.value !== undefined && repeatAttr.valueStart !== undefined) {
          const parsed = parseRepeatLocal(repeatAttr.value, repeatAttr.valueStart);
          if (parsed) symbols.push(parsed);
        }

        return symbols;
      }),
  ];
}

function parseControllerAlias(
  value: string,
  valueStart: number,
): ControllerAliasSymbol | undefined {
  const match = /^\s*([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)\s*$/.exec(
    value,
  );
  if (!match) return undefined;

  const aliasOffset = value.indexOf(match[2]);
  return {
    kind: "controller",
    name: match[2],
    type: match[1],
    controller: match[1],
    start: valueStart + aliasOffset,
    end: valueStart + aliasOffset + match[2].length,
  };
}

function parseRepeatLocal(
  value: string,
  valueStart: number,
): RepeatLocalSymbol | undefined {
  const match = /^\s*([A-Za-z_$][\w$]*)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+[\s\S]+)?\s*$/.exec(
    value,
  );
  if (!match) return undefined;

  const nameOffset = value.indexOf(match[1]);
  const collection = match[2].trim();
  return {
    kind: "repeat",
    name: match[1],
    type: `__AngularTsRepeatItem<typeof ${collection}>`,
    collection,
    start: valueStart + nameOffset,
    end: valueStart + nameOffset + match[1].length,
  };
}

function componentTemplateSymbolsAtOffset(
  text: string,
  offset: number,
): ControllerAliasSymbol[] {
  const template = templateStringAtOffset(text, offset);
  if (!template) return [];

  const componentStart = text.lastIndexOf(".component", template.propertyStart);
  if (componentStart < 0) return [];

  const open = text.indexOf("(", componentStart);
  if (open < 0) return [];

  const close = findMatchingParen(text, open);
  if (close < 0 || offset > close) return [];

  const callText = text.slice(componentStart, close + 1);
  const controller = parseControllerName(callText);
  if (!controller) return [];
  const bindings = parseComponentBindingTypes(callText);

  return [
    {
      kind: "controller",
      name: parseControllerAs(callText) ?? "$ctrl",
      type: bindings.length ? `${controller} & { ${bindings.join("; ")} }` : controller,
      controller,
      start: template.valueStart,
      end: template.valueStart,
    },
  ];
}

function templateStringAtOffset(
  text: string,
  offset: number,
): { propertyStart: number; valueStart: number; valueEnd: number } | undefined {
  const templateRe = /\btemplate\s*:\s*(['"`])/g;
  let match: RegExpExecArray | null;

  while ((match = templateRe.exec(text))) {
    const quote = match[1];
    const valueStart = match.index + match[0].length;
    const valueEnd = findStringEnd(text, valueStart, quote);
    if (valueEnd < 0) continue;
    if (offset >= valueStart && offset <= valueEnd) {
      return {
        propertyStart: match.index,
        valueStart,
        valueEnd,
      };
    }
    templateRe.lastIndex = valueEnd + 1;
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

function parseComponentBindingTypes(callText: string): string[] {
  const bindingsProperty = /\bbindings\s*:\s*\{/.exec(callText);
  if (!bindingsProperty) return [];

  const open = bindingsProperty.index + bindingsProperty[0].lastIndexOf("{");
  const close = findMatchingBrace(callText, open);
  if (close < 0) return [];

  const body = callText.slice(open + 1, close);
  const bindingRe = /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:\s*(['"`])([^'"`]+)\2/g;
  const bindings: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = bindingRe.exec(body))) {
    const name = match[1];
    const mode = match[3];
    bindings.push(`${name}${mode.includes("?") ? "?" : ""}: ${bindingType(mode)}`);
  }

  return bindings;
}

function bindingType(mode: string): string {
  if (mode.startsWith("@")) return "string";
  if (mode.startsWith("&")) return "(locals?: Record<string, unknown>) => unknown";
  return "unknown";
}

function findMatchingBrace(text: string, open: number): number {
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

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) return index;
  }

  return -1;
}

function findMatchingParen(text: string, open: number): number {
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

    if (char === "(") depth++;
    if (char === ")") depth--;

    if (depth === 0) return index;
  }

  return -1;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
