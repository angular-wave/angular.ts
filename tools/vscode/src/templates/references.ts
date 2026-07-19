import type { AngularTsSymbolKind } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";
import { scanHtmlElements } from "./htmlScanner";
import { expressionIdentifierAt } from "./expressionSymbols";

export interface AngularTsReference {
  kind: "controller" | "service" | "component" | "expression";
  name: string;
  start: number;
  end: number;
  targetKinds: AngularTsSymbolKind[];
}

export function findAngularTsReferenceAt(
  text: string,
  offset: number,
  languageId: string,
): AngularTsReference | undefined {
  if (languageId === "html") {
    return (
      findHtmlControllerReferenceAt(text, offset) ??
      findHtmlExpressionReferenceAt(text, offset)
    );
  }
  if (
    ["typescript", "javascript", "typescriptreact", "javascriptreact"].includes(
      languageId,
    )
  ) {
    return findSourceReferenceAt(text, offset);
  }
  return undefined;
}

function findHtmlExpressionReferenceAt(
  text: string,
  offset: number,
): AngularTsReference | undefined {
  const interpolation = interpolationExpressionAt(text, offset);
  if (interpolation) {
    return expressionReferenceAt(
      interpolation.expression,
      offset,
      interpolation.expressionStart,
    );
  }

  for (const element of scanHtmlElements(text)) {
    for (const attr of element.attributes) {
      if (
        !isAngularTsExpressionAttribute(attr.name) ||
        attr.value === undefined ||
        attr.valueStart === undefined ||
        attr.valueEnd === undefined ||
        offset < attr.valueStart ||
        offset > attr.valueEnd
      ) {
        continue;
      }

      return expressionReferenceAt(attr.value, offset, attr.valueStart);
    }
  }

  return undefined;
}

function interpolationExpressionAt(
  text: string,
  offset: number,
): { expression: string; expressionStart: number } | undefined {
  const interpolationStart = text.lastIndexOf("{{", offset);
  if (interpolationStart < 0) return undefined;

  const interpolationEnd = text.indexOf("}}", interpolationStart + 2);
  if (interpolationEnd < 0 || offset > interpolationEnd) return undefined;

  const expressionStart = interpolationStart + 2;
  return {
    expression: text.slice(expressionStart, interpolationEnd),
    expressionStart,
  };
}

function expressionReferenceAt(
  expression: string,
  offset: number,
  expressionStart: number,
): AngularTsReference | undefined {
  const identifier = expressionIdentifierAt(expression, offset, expressionStart);
  if (!identifier) return undefined;

  return {
    kind: "expression",
    name: identifier.name,
    start: identifier.start,
    end: identifier.start + identifier.name.length,
    targetKinds: ["controller", "service", "factory", "provider", "constant"],
  };
}

function isAngularTsExpressionAttribute(name: string): boolean {
  return /^ng[-A-Z]/.test(name) || /^data-ng[-A-Z]/.test(name);
}

function findHtmlControllerReferenceAt(
  text: string,
  offset: number,
): AngularTsReference | undefined {
  for (const element of scanHtmlElements(text)) {
    for (const attr of element.attributes) {
      if (normalizeLookupName(attr.name) !== "ngController") continue;
      if (
        attr.value === undefined ||
        attr.valueStart === undefined ||
        attr.valueEnd === undefined ||
        offset < attr.valueStart ||
        offset > attr.valueEnd
      ) {
        continue;
      }

      const controller = parseControllerValue(
        attr.value,
        attr.valueStart,
        offset,
      );
      if (!controller) return undefined;

      return {
        kind: "controller",
        name: controller.name,
        start: controller.start,
        end: controller.end,
        targetKinds: ["controller"],
      };
    }
  }

  return undefined;
}

function findSourceReferenceAt(
  text: string,
  offset: number,
): AngularTsReference | undefined {
  const literal = stringLiteralAt(text, offset);
  if (!literal) return undefined;

  if (isControllerPropertyValue(text, literal.start)) {
    const controller = parseControllerValue(
      literal.value,
      literal.valueStart,
      offset,
    );
    if (!controller) return undefined;

    return {
      kind: "controller",
      name: controller.name,
      start: controller.start,
      end: controller.end,
      targetKinds: ["controller"],
    };
  }

  if (isComponentPropertyValue(text, literal.start)) {
    return {
      kind: "component",
      name: literal.value,
      start: literal.valueStart,
      end: literal.valueEnd,
      targetKinds: ["component"],
    };
  }

  if (
    isDependencyInjectionToken(text, literal.start, literal.end) ||
    isInjectAssignmentToken(text, literal.start, literal.end)
  ) {
    return {
      kind: "service",
      name: literal.value,
      start: literal.valueStart,
      end: literal.valueEnd,
      targetKinds: ["service", "factory", "provider", "constant"],
    };
  }

  return undefined;
}

function parseControllerValue(
  value: string,
  valueStart: number,
  offset: number,
): { name: string; start: number; end: number } | undefined {
  const match = /^\s*([A-Za-z_$][\w$]*)/.exec(value);
  if (!match) return undefined;

  const start = valueStart + match[0].indexOf(match[1]);
  const end = start + match[1].length;
  if (offset < start || offset > end) return undefined;

  return {
    name: match[1],
    start,
    end,
  };
}

function isControllerPropertyValue(text: string, literalStart: number): boolean {
  const before = text.slice(Math.max(0, literalStart - 80), literalStart);
  return /\bcontroller\s*:\s*$/.test(before);
}

function isComponentPropertyValue(text: string, literalStart: number): boolean {
  const before = text.slice(Math.max(0, literalStart - 80), literalStart);
  return /\bcomponent\s*:\s*$/.test(before);
}

function isDependencyInjectionToken(
  text: string,
  literalStart: number,
  literalEnd: number,
): boolean {
  const arrayStart = text.lastIndexOf("[", literalStart);
  if (arrayStart < 0) return false;

  const arrayEnd = text.indexOf("]", literalEnd);
  if (arrayEnd < 0) return false;

  const after = text.slice(literalEnd, arrayEnd);
  return /\bfunction\b|=>/.test(after);
}

function isInjectAssignmentToken(
  text: string,
  literalStart: number,
  literalEnd: number,
): boolean {
  const arrayStart = text.lastIndexOf("[", literalStart);
  if (arrayStart < 0) return false;

  const arrayEnd = text.indexOf("]", literalEnd);
  if (arrayEnd < 0) return false;

  const beforeArray = text.slice(Math.max(0, arrayStart - 80), arrayStart);
  return /\.\$inject\s*=\s*$/.test(beforeArray);
}

function stringLiteralAt(
  text: string,
  offset: number,
):
  | {
      value: string;
      start: number;
      end: number;
      valueStart: number;
      valueEnd: number;
    }
  | undefined {
  let index = 0;
  while (index < text.length) {
    const quote = text[index];
    if (quote !== "'" && quote !== '"' && quote !== "`") {
      index++;
      continue;
    }

    const start = index;
    index++;
    let value = "";
    let escaped = false;

    for (; index < text.length; index++) {
      const char = text[index];
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
        const end = index + 1;
        const valueStart = start + 1;
        const valueEnd = index;
        if (offset >= valueStart && offset <= valueEnd) {
          return { value, start, end, valueStart, valueEnd };
        }
        index = end;
        break;
      }
      value += char;
    }
  }

  return undefined;
}
