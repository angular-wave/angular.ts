import type { TemplateDiagnostic } from "./diagnostics";
import type { AngularTsCatalogEntry } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";
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
