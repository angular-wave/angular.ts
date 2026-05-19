import type {
  AngularTsCatalogEntry,
  AngularTsSymbolKind,
  BindingInfo,
} from "../catalog/types";
import {
  componentHtmlName,
  directiveAliases,
  directiveHtmlName,
  directiveNormalize,
} from "../catalog/names";

const REGISTRATION_RE =
  /\.(directive|component|filter|controller|service|factory|provider|constant)\s*\(\s*(['"`])([A-Za-z_$][\w$-]*)\2/g;

export interface ParsedRegistration extends AngularTsCatalogEntry {
  offset: number;
}

export function parseAngularTsRegistrations(
  text: string,
  file: string,
): ParsedRegistration[] {
  const registrations: ParsedRegistration[] = [];
  let match: RegExpExecArray | null;

  while ((match = REGISTRATION_RE.exec(text))) {
    const kind = match[1] as AngularTsSymbolKind;
    const name = match[3];
    const offset = match.index;
    const location = offsetToLocation(text, offset);
    const callText = readCallText(text, match.index);
    const bindings =
      kind === "component" || kind === "directive"
        ? parseBindings(text, callText, file, offset)
        : undefined;
    const restrict =
      kind === "component" ? "E" : kind === "directive" ? parseRestrict(callText) : undefined;
    const allowedLocations = restrict
      ? restrictToAllowedLocations(restrict)
      : undefined;
    const normalizedName =
      kind === "directive" ? directiveNormalize(name) : name;
    const htmlName =
      kind === "component"
        ? componentHtmlName(name)
        : kind === "directive"
          ? directiveHtmlName(name)
          : undefined;
    const aliases =
      kind === "component" && htmlName
        ? [htmlName]
        : kind === "directive" && htmlName
          ? directiveAliases(htmlName)
          : [];

    registrations.push({
      kind,
      name,
      normalizedName,
      htmlName,
      aliases,
      bindings,
      restrict,
      allowedLocations,
      description: describeRegistration(kind, name, bindings),
      source: {
        file,
        line: location.line,
        character: location.character,
      },
      offset,
    });
  }

  return registrations;
}

function describeRegistration(
  kind: AngularTsSymbolKind,
  name: string,
  bindings: BindingInfo[] | undefined,
): string {
  if ((kind === "component" || kind === "directive") && bindings?.length) {
    const bindingList = bindings
      .map((binding) => `${binding.name}: ${binding.mode}${binding.optional ? "?" : ""}`)
      .join(", ");
    return `Custom AngularTS ${kind} \`${name}\` with bindings ${bindingList}.`;
  }

  return `Custom AngularTS ${kind} \`${name}\`.`;
}

function readCallText(text: string, start: number): string {
  const open = text.indexOf("(", start);
  if (open < 0) return text.slice(start, start + 2000);

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

    if (char === "(" || char === "{" || char === "[") depth++;
    if (char === ")" || char === "}" || char === "]") depth--;

    if (depth === 0) return text.slice(start, index + 1);
  }

  return text.slice(start);
}

function parseBindings(
  text: string,
  callText: string,
  file: string,
  callOffset: number,
): BindingInfo[] | undefined {
  const objectMatch = /\b(?:bindings|scope|bindToController)\s*:\s*\{([\s\S]*?)\}/m.exec(
    callText,
  );
  if (!objectMatch) return undefined;

  const body = objectMatch[1];
  const bindings: BindingInfo[] = [];
  const bindingRe =
    /(?:^|,)\s*([A-Za-z_$][\w$-]*)\s*:\s*(?:(['"`])([@<=>&])(\?)?(?:[\w$-]*)?\2|\{[\s\S]*?mode\s*:\s*(['"`])([@<=>&])(\?)?\5[\s\S]*?\})/g;
  let match: RegExpExecArray | null;

  while ((match = bindingRe.exec(body))) {
    const mode = match[3] ?? match[6];
    const optional = Boolean(match[4] ?? match[7]);
    const bindingOffset = callOffset + objectMatch.index + match.index;
    const sourceLocation = offsetToLocation(text, bindingOffset);

    bindings.push({
      name: match[1],
      mode,
      optional,
      source: {
        file,
        line: sourceLocation.line,
        character: sourceLocation.character,
      },
    });
  }

  return bindings.length ? bindings : undefined;
}

function parseRestrict(callText: string): string {
  const match = /\brestrict\s*:\s*(['"`])([AE]+)\1/.exec(callText);
  const restrict = match?.[2] ?? "A";
  return restrict;
}

function restrictToAllowedLocations(
  restrict: string,
): Array<"attribute" | "element"> {
  const locations: Array<"attribute" | "element"> = [];
  if (restrict.includes("A")) locations.push("attribute");
  if (restrict.includes("E")) locations.push("element");
  return locations;
}

function offsetToLocation(
  text: string,
  offset: number,
): { line: number; character: number } {
  const prefix = text.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1]?.length ?? 0,
  };
}
