import type {
  AngularTsCatalogEntry,
  AngularTsSymbolKind,
  BindingInfo,
  RouteComponentInfo,
  RouteParamInfo,
  RouteResolveInfo,
} from "../catalog/types";
import {
  componentHtmlName,
  directiveAliases,
  directiveHtmlName,
  directiveNormalize,
} from "../catalog/names";

const REGISTRATION_RE =
  /\.(directive|component|filter|controller|service|factory|provider|constant)\s*\(\s*(['"`])([A-Za-z_$][\w$-]*)\2/g;
const OBJECT_MAP_REGISTRATION_RE = /\.(directive|register)\s*\(\s*\{/g;
const STATE_CALL_RE = /\.state\s*\(/g;
const ROUTER_CALL_RE = /\.router\s*\(/g;
const LAZY_STATE_CALL_RE = /\.lazyState\s*\(/g;

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
    registrations.push(createRegistration(text, file, kind, name, offset));
  }

  while ((match = OBJECT_MAP_REGISTRATION_RE.exec(text))) {
    const methodName = match[1];
    const kind: AngularTsSymbolKind =
      methodName === "register" ? "controller" : "directive";
    const offset = match.index;
    const callText = readCallText(text, offset);
    const mapNames = parseObjectMapRegistrationNames(callText);

    for (const mapName of mapNames) {
      registrations.push(
        createRegistration(
          text,
          file,
          kind,
          mapName.name,
          offset + mapName.offset,
          offset,
          `.${methodName}("${mapName.name}", ${mapName.valueText})`,
        ),
      );
    }
  }

  registrations.push(...parseRouteRegistrations(text, file));

  return registrations.sort((left, right) => left.offset - right.offset);
}

function parseRouteRegistrations(text: string, file: string): ParsedRegistration[] {
  const routes: ParsedRegistration[] = [];
  let match: RegExpExecArray | null;

  while ((match = STATE_CALL_RE.exec(text))) {
    const callOffset = match.index;
    const callText = readCallText(text, callOffset);
    routes.push(...parseStateCallRoutes(text, callText, file, callOffset));
  }

  while ((match = ROUTER_CALL_RE.exec(text))) {
    const callOffset = match.index;
    const callText = readCallText(text, callOffset);
    const [root] = splitTopLevelArguments(callText);
    if (root?.text.trim().startsWith("{")) {
      routes.push(
        ...parseRouterObjectRoutes(
          text,
          root.text,
          file,
          callOffset + root.start,
          undefined,
        ),
      );
    }
  }

  while ((match = LAZY_STATE_CALL_RE.exec(text))) {
    const callOffset = match.index;
    const callText = readCallText(text, callOffset);
    const boundary = parseLazyStateBoundary(text, callText, file, callOffset);
    if (boundary) routes.push(boundary);
  }

  return routes;
}

function parseStateCallRoutes(
  sourceText: string,
  callText: string,
  file: string,
  callOffset: number,
): ParsedRegistration[] {
  const args = splitTopLevelArguments(callText);
  const [first, second] = args;
  if (!first) return [];

  const namedState = parseStringLiteral(first.text.trim());
  if (namedState && second?.text.trim().startsWith("{")) {
    return [
      createRouteRegistration(
        sourceText,
        file,
        namedState.value,
        callOffset + first.start + namedState.start,
        second.text,
        callOffset + second.start,
      ),
    ];
  }

  if (first.text.trim().startsWith("{")) {
    return parseRouterObjectRoutes(
      sourceText,
      first.text,
      file,
      callOffset + first.start,
      undefined,
    );
  }

  return [];
}

function parseRouterObjectRoutes(
  sourceText: string,
  objectText: string,
  file: string,
  objectOffset: number,
  parentName: string | undefined,
): ParsedRegistration[] {
  const nameProperty = findTopLevelProperty(objectText, "name");
  if (!nameProperty) return [];

  const nameLiteral = parseStringLiteral(nameProperty.valueText.trim());
  if (!nameLiteral) return [];

  const name = resolveRouteName(parentName, nameLiteral.value);
  const nameStart =
    objectOffset + nameProperty.valueStart + nameLiteral.start;
  const routes = [
    createRouteRegistration(
      sourceText,
      file,
      name,
      nameStart,
      objectText,
      objectOffset,
    ),
  ];

  const childrenProperty = findTopLevelProperty(objectText, "children");
  if (childrenProperty) {
    for (const child of readTopLevelObjectLiterals(childrenProperty.valueText)) {
      routes.push(
        ...parseRouterObjectRoutes(
          sourceText,
          child.text,
          file,
          objectOffset + childrenProperty.valueStart + child.start,
          name,
        ),
      );
    }
  }

  return routes;
}

function createRouteRegistration(
  sourceText: string,
  file: string,
  name: string,
  nameOffset: number,
  declarationText: string,
  declarationOffset: number,
): ParsedRegistration {
  const location = offsetToLocation(sourceText, nameOffset);
  const params = parseRouteParams(sourceText, declarationText, file, declarationOffset);
  const routeComponent = parseRouteComponent(
    sourceText,
    declarationText,
    file,
    declarationOffset,
  );
  const routeResolves = parseRouteResolves(
    sourceText,
    declarationText,
    file,
    declarationOffset,
  );

  return {
    kind: "route",
    name,
    normalizedName: name,
    aliases: [],
    description: params.length
      ? `AngularTS route \`${name}\` with params ${params
          .map((param) => `${param.name}${param.optional ? "?" : ""}`)
          .join(", ")}.`
      : `AngularTS route \`${name}\`.`,
    routeComponent,
    routeParams: params,
    routeResolves,
    source: {
      file,
      line: location.line,
      character: location.character,
    },
    offset: nameOffset,
  };
}

function parseLazyStateBoundary(
  sourceText: string,
  callText: string,
  file: string,
  callOffset: number,
): ParsedRegistration | undefined {
  const [first] = splitTopLevelArguments(callText);
  const namespace = first ? parseStringLiteral(first.text.trim()) : undefined;
  if (!first || !namespace) return undefined;

  const nameOffset = callOffset + first.start + namespace.start;
  const location = offsetToLocation(sourceText, nameOffset);

  return {
    kind: "route",
    name: namespace.value,
    normalizedName: namespace.value,
    aliases: [],
    description: `AngularTS lazy route boundary \`${namespace.value}\`.`,
    routeLazyBoundary: true,
    source: {
      file,
      line: location.line,
      character: location.character,
    },
    offset: nameOffset,
  };
}

function parseRouteComponent(
  sourceText: string,
  declarationText: string,
  file: string,
  declarationOffset: number,
): RouteComponentInfo | undefined {
  const componentProperty = findTopLevelProperty(declarationText, "component");
  const componentLiteral = componentProperty
    ? parseStringLiteral(componentProperty.valueText.trim())
    : undefined;
  if (!componentProperty || !componentLiteral) return undefined;

  const sourceOffset =
    declarationOffset + componentProperty.valueStart + componentLiteral.start;
  return {
    name: componentLiteral.value,
    source: {
      file,
      ...offsetToLocation(sourceText, sourceOffset),
    },
    sourceOffset,
  };
}

function parseRouteResolves(
  sourceText: string,
  declarationText: string,
  file: string,
  declarationOffset: number,
): RouteResolveInfo[] | undefined {
  const resolveProperty = findTopLevelProperty(declarationText, "resolve");
  if (!resolveProperty) return undefined;

  const resolveObject = unwrapObject(resolveProperty.valueText);
  if (!resolveObject) return undefined;

  const resolves = readTopLevelProperties(resolveObject.text).map((property) => {
    const sourceOffset =
      declarationOffset +
      resolveProperty.valueStart +
      resolveObject.bodyStart +
      property.nameStart;
    const valueStart =
      declarationOffset +
      resolveProperty.valueStart +
      resolveObject.bodyStart +
      property.valueStart;
    const value = property.valueText.trim();
    const leadingWhitespace = property.valueText.match(/^\s*/)?.[0].length ?? 0;
    return {
      name: property.name,
      value,
      valueStart: valueStart + leadingWhitespace,
      valueEnd: valueStart + leadingWhitespace + value.length,
      source: {
        file,
        ...offsetToLocation(sourceText, sourceOffset),
      },
      sourceOffset,
    };
  });

  return resolves.length ? resolves : undefined;
}

function createRegistration(
  text: string,
  file: string,
  kind: AngularTsSymbolKind,
  name: string,
  offset: number,
  callOffset = offset,
  callTextOverride?: string,
): ParsedRegistration {
  const location = offsetToLocation(text, offset);
  const callText = callTextOverride ?? readCallText(text, callOffset);
  const bindings =
    kind === "component" || kind === "directive"
      ? parseBindings(text, callText, file, callOffset)
      : undefined;
  const signature =
    kind === "filter" ? parseFilterSignature(name, callText) : undefined;
  const metadata =
    kind === "component" || kind === "directive"
      ? parseDefinitionMetadata(callText)
      : {};
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
  const registrationDescription = describeRegistration(
    kind,
    name,
    bindings,
    metadata,
  );
  const docComment = readLeadingDocComment(text, offset);
  const description = docComment
    ? `${docComment}\n\n${registrationDescription}`
    : registrationDescription;

  return {
    kind,
    name,
    normalizedName,
    htmlName,
    aliases,
    bindings,
    signature,
    ...metadata,
    restrict,
    allowedLocations,
    description,
    source: {
      file,
      line: location.line,
      character: location.character,
    },
    offset,
  };
}

function readLeadingDocComment(text: string, offset: number): string | undefined {
  const before = text.slice(0, offset);
  const commentStart = before.lastIndexOf("/**");
  if (commentStart < 0) return undefined;

  const commentEnd = text.indexOf("*/", commentStart);
  if (commentEnd < 0 || commentEnd > offset) return undefined;

  const gap = text.slice(commentEnd + 2, offset);
  if (!/^[\s.,;()[\]{}:]*$/.test(gap)) return undefined;

  const comment = text.slice(commentStart + 3, commentEnd);
  const description = comment
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line && !line.startsWith("@"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return description || undefined;
}

function describeRegistration(
  kind: AngularTsSymbolKind,
  name: string,
  bindings: BindingInfo[] | undefined,
  metadata: DefinitionMetadata = {},
): string {
  const details: string[] = [];
  if (metadata.controller) details.push(`controller ${metadata.controller}`);
  if (metadata.controllerAs) details.push(`alias ${metadata.controllerAs}`);

  if ((kind === "component" || kind === "directive") && bindings?.length) {
    const bindingList = bindings
      .map((binding) => `${binding.name}: ${binding.mode}${binding.optional ? "?" : ""}`)
      .join(", ");
    details.unshift(`bindings ${bindingList}`);
  }

  if (details.length) {
    return `Custom AngularTS ${kind} \`${name}\` with ${details.join(", ")}.`;
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

function parseObjectMapRegistrationNames(
  callText: string,
): Array<{ name: string; offset: number; valueText: string }> {
  const open = callText.indexOf("{");
  if (open < 0) return [];

  const close = findMatchingBrace(callText, open);
  if (close < 0) return [];

  const body = callText.slice(open + 1, close);
  const names: Array<{ name: string; offset: number; valueText: string }> = [];
  let index = 0;

  while (index < body.length) {
    index = skipWhitespaceAndCommas(body, index);
    const property = readObjectPropertyName(body, index);
    if (!property) {
      index++;
      continue;
    }

    let cursor = skipWhitespace(body, property.end);
    if (body[cursor] !== ":") {
      if (body[cursor] === "," || cursor >= body.length) {
        names.push({
          name: property.name,
          offset: open + 1 + property.start,
          valueText: property.name,
        });
        index = cursor + 1;
        continue;
      }

      index = property.end;
      continue;
    }
    const valueStart = cursor + 1;
    const valueEnd = skipObjectValue(body, valueStart);

    names.push({
      name: property.name,
      offset: open + 1 + property.start,
      valueText: body.slice(valueStart, valueEnd).replace(/,\s*$/, ""),
    });
    index = valueEnd;
  }

  return names;
}

function splitTopLevelArguments(
  callText: string,
): Array<{ text: string; start: number; end: number }> {
  const open = callText.indexOf("(");
  if (open < 0) return [];

  const close = findMatchingDelimiter(callText, open, "(", ")");
  if (close < 0) return [];

  const body = callText.slice(open + 1, close);
  const args: Array<{ text: string; start: number; end: number }> = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;

  for (let index = 0; index <= body.length; index++) {
    const char = body[index] ?? ",";

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
    if (depth === 0 && char === ",") {
      const raw = body.slice(start, index);
      const leadingWhitespace = raw.match(/^\s*/)?.[0].length ?? 0;
      const trailingWhitespace = raw.match(/\s*$/)?.[0].length ?? 0;
      const trimmedStart = start + leadingWhitespace;
      const trimmedEnd = index - trailingWhitespace;
      if (trimmedEnd > trimmedStart) {
        args.push({
          text: body.slice(trimmedStart, trimmedEnd),
          start: open + 1 + trimmedStart,
          end: open + 1 + trimmedEnd,
        });
      }
      start = index + 1;
    }
  }

  return args;
}

function parseStringLiteral(
  text: string,
): { value: string; start: number; end: number } | undefined {
  const quote = text[0];
  if (quote !== "'" && quote !== '"' && quote !== "`") return undefined;

  let escaped = false;
  let value = "";

  for (let index = 1; index < text.length; index++) {
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
    if (char === quote) return { value, start: 1, end: index };
    value += char;
  }

  return undefined;
}

function resolveRouteName(
  parentName: string | undefined,
  childName: string,
): string {
  if (!parentName || childName.includes(".")) return childName;
  return `${parentName}.${childName}`;
}

function parseRouteParams(
  sourceText: string,
  declarationText: string,
  file: string,
  declarationOffset: number,
): RouteParamInfo[] {
  const params = new Map<string, RouteParamInfo>();
  const urlProperty = findTopLevelProperty(declarationText, "url");
  const urlLiteral = urlProperty
    ? parseStringLiteral(urlProperty.valueText.trim())
    : undefined;
  if (urlProperty && urlLiteral) {
    const url = urlLiteral.value;
    for (const param of parseUrlRouteParams(url)) {
      params.set(param.name, {
        ...param,
        source: {
          file,
          ...offsetToLocation(
            sourceText,
            declarationOffset + urlProperty.valueStart + urlLiteral.start,
          ),
        },
      });
    }
  }

  const paramsProperty = findTopLevelProperty(declarationText, "params");
  if (paramsProperty) {
    const paramObject = unwrapObject(paramsProperty.valueText);
    if (paramObject) {
      for (const property of readTopLevelProperties(paramObject.text)) {
        params.set(property.name, {
          name: property.name,
          optional: isOptionalParamDeclaration(property.valueText),
          valueType: parseParamDeclarationValueType(property.valueText),
          source: {
            file,
            ...offsetToLocation(
              sourceText,
              declarationOffset +
                paramsProperty.valueStart +
                paramObject.bodyStart +
                property.nameStart,
            ),
          },
        });
      }
    }
  }

  return Array.from(params.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function parseUrlRouteParams(
  url: string,
): Array<{
  name: string;
  optional: boolean;
  valueType?: RouteParamInfo["valueType"];
}> {
  const [pathPart, queryPart = ""] = url.split("?");
  const params = new Map<
    string,
    { optional: boolean; valueType?: RouteParamInfo["valueType"] }
  >();
  const add = (
    name: string,
    optional: boolean,
    valueType?: RouteParamInfo["valueType"],
  ) => {
    if (!name || params.has(name)) return;
    params.set(name, { optional, valueType });
  };

  const pathWithoutTypedParams = pathPart.replace(/\{[^}]*\}/g, "");
  for (const match of pathWithoutTypedParams.matchAll(/:([A-Za-z_$][\w$]*)/g)) {
    add(match[1], false);
  }
  for (const match of pathPart.matchAll(/\{\s*([A-Za-z_$][\w$]*)\s*(?::\s*([^}]+))?\}/g)) {
    add(match[1], false, paramTypeNameToValueType(match[2]));
  }
  for (const match of queryPart.matchAll(/(?:^|[&?])\s*\{?\s*([A-Za-z_$][\w$]*)/g)) {
    add(match[1], true);
  }

  return Array.from(params, ([name, param]) => ({ name, ...param }));
}

function isOptionalParamDeclaration(valueText: string): boolean {
  return /\bvalue\s*:/.test(valueText) || /\boptional\s*:\s*true\b/.test(valueText);
}

function parseParamDeclarationValueType(
  valueText: string,
): RouteParamInfo["valueType"] | undefined {
  const typeProperty = findTopLevelProperty(valueText, "type");
  if (!typeProperty) return undefined;

  const typeLiteral = parseStringLiteral(typeProperty.valueText.trim());
  if (typeLiteral) return paramTypeNameToValueType(typeLiteral.value);

  const typeIdentifier = /^([A-Za-z_$][\w$]*)/.exec(typeProperty.valueText.trim());
  return paramTypeNameToValueType(typeIdentifier?.[1]);
}

function paramTypeNameToValueType(
  typeName: string | undefined,
): RouteParamInfo["valueType"] | undefined {
  const normalized = typeName?.trim().replace(/^['"`]|['"`]$/g, "").toLowerCase();
  switch (normalized) {
    case "bool":
    case "boolean":
      return "boolean";
    case "date":
      return "Date";
    case "int":
    case "integer":
    case "number":
      return "number";
    case "path":
    case "string":
      return "string";
    default:
      return undefined;
  }
}

function findTopLevelProperty(
  objectText: string,
  propertyName: string,
):
  | {
      name: string;
      nameStart: number;
      valueText: string;
      valueStart: number;
      valueEnd: number;
    }
  | undefined {
  const object = unwrapObject(objectText);
  if (!object) return undefined;
  return readTopLevelProperties(object.text).find(
    (property) => property.name === propertyName,
  );
}

function readTopLevelProperties(text: string): Array<{
  name: string;
  nameStart: number;
  valueText: string;
  valueStart: number;
  valueEnd: number;
}> {
  const properties: Array<{
    name: string;
    nameStart: number;
    valueText: string;
    valueStart: number;
    valueEnd: number;
  }> = [];
  let index = 0;

  while (index < text.length) {
    index = skipWhitespaceAndCommas(text, index);
    const property = readObjectPropertyName(text, index);
    if (!property) {
      index++;
      continue;
    }

    let cursor = skipWhitespace(text, property.end);
    if (text[cursor] !== ":") {
      index = property.end;
      continue;
    }

    const valueStart = skipWhitespace(text, cursor + 1);
    const valueEnd = skipObjectValue(text, valueStart);
    properties.push({
      name: property.name,
      nameStart: property.start,
      valueText: text.slice(valueStart, valueEnd).replace(/,\s*$/, ""),
      valueStart,
      valueEnd,
    });
    index = valueEnd;
  }

  return properties;
}

function readTopLevelObjectLiterals(
  text: string,
): Array<{ text: string; start: number; end: number }> {
  const array = unwrapArray(text);
  if (!array) return [];

  const objects: Array<{ text: string; start: number; end: number }> = [];
  let index = 0;

  while (index < array.text.length) {
    const open = array.text.indexOf("{", index);
    if (open < 0) break;
    const close = findMatchingBrace(array.text, open);
    if (close < 0) break;
    objects.push({
      text: array.text.slice(open, close + 1),
      start: array.bodyStart + open,
      end: array.bodyStart + close + 1,
    });
    index = close + 1;
  }

  return objects;
}

function unwrapObject(
  text: string,
): { text: string; bodyStart: number; bodyEnd: number } | undefined {
  const open = text.indexOf("{");
  if (open < 0) return undefined;
  const close = findMatchingBrace(text, open);
  if (close < 0) return undefined;
  return {
    text: text.slice(open + 1, close),
    bodyStart: open + 1,
    bodyEnd: close,
  };
}

function unwrapArray(
  text: string,
): { text: string; bodyStart: number; bodyEnd: number } | undefined {
  const open = text.indexOf("[");
  if (open < 0) return undefined;
  const close = findMatchingDelimiter(text, open, "[", "]");
  if (close < 0) return undefined;
  return {
    text: text.slice(open + 1, close),
    bodyStart: open + 1,
    bodyEnd: close,
  };
}

function findMatchingBrace(text: string, open: number): number {
  return findMatchingDelimiter(text, open, "{", "}");
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

function skipWhitespaceAndCommas(text: string, index: number): number {
  while (/[\s,]/.test(text[index] ?? "")) index++;
  return index;
}

function skipWhitespace(text: string, index: number): number {
  while (/\s/.test(text[index] ?? "")) index++;
  return index;
}

function readObjectPropertyName(
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
        return { name: value, start: index + 1, end: cursor + 1 };
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

interface DefinitionMetadata {
  controller?: string;
  controllerAs?: string;
  template?: string;
  templateUrl?: string;
  require?: string[];
}

function parseDefinitionMetadata(callText: string): DefinitionMetadata {
  const metadata: DefinitionMetadata = {};
  const controller = parseController(callText);
  const controllerAs = parseStringProperty(callText, "controllerAs");

  if (controller?.name) metadata.controller = controller.name;
  metadata.controllerAs = controllerAs ?? controller?.alias;

  const templateUrl = parseStringProperty(callText, "templateUrl");
  if (templateUrl) metadata.templateUrl = templateUrl;

  const template = parseStringProperty(callText, "template");
  if (template) metadata.template = template;

  const require = parseRequire(callText);
  if (require.length) metadata.require = require;

  return metadata;
}

function parseFilterSignature(name: string, callText: string): string {
  const params = parseFilterParameters(callText);

  if (params.length <= 1) return `input | ${name}`;

  return `input | ${name}:${params.slice(1).join(":")}`;
}

function parseFilterParameters(callText: string): string[] {
  const functionMatch =
    /\breturn\s+(?:async\s*)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\(([\s\S]*?)\)/m.exec(
      callText,
    );
  if (functionMatch) return parseParameterNames(functionMatch[1]);

  const arrowMatch =
    /\breturn\s+(?:async\s*)?\(([\s\S]*?)\)\s*(?::\s*[^=]+)?=>/m.exec(
      callText,
    );
  if (arrowMatch) return parseParameterNames(arrowMatch[1]);

  const singleArrowMatch =
    /\breturn\s+(?:async\s*)?([A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=>/m.exec(
      callText,
    );
  if (singleArrowMatch) return [singleArrowMatch[1]];

  const returnedIdentifierMatches = Array.from(
    callText.matchAll(/\breturn\s+([A-Za-z_$][\w$]*)\s*;?/gm),
  );
  const returnedIdentifierMatch =
    returnedIdentifierMatches[returnedIdentifierMatches.length - 1];
  if (!returnedIdentifierMatch) return [];

  return parseNamedFilterParameters(callText, returnedIdentifierMatch[1]);
}

function parseNamedFilterParameters(callText: string, identifier: string): string[] {
  const escapedIdentifier = escapeRegExp(identifier);
  const functionMatch = new RegExp(
    `\\bfunction\\s+${escapedIdentifier}\\s*\\(([\\s\\S]*?)\\)`,
    "m",
  ).exec(callText);
  if (functionMatch) return parseParameterNames(functionMatch[1]);

  const functionExpressionMatch = new RegExp(
    `\\b(?:const|let|var)\\s+${escapedIdentifier}(?:\\s*:[^=]+)?\\s*=\\s*(?:async\\s*)?function(?:\\s+[A-Za-z_$][\\w$]*)?\\s*\\(([\\s\\S]*?)\\)`,
    "m",
  ).exec(callText);
  if (functionExpressionMatch) {
    return parseParameterNames(functionExpressionMatch[1]);
  }

  const arrowMatch = new RegExp(
    `\\b(?:const|let|var)\\s+${escapedIdentifier}(?:\\s*:[^=]+)?\\s*=\\s*(?:async\\s*)?\\(([\\s\\S]*?)\\)\\s*(?::\\s*[^=]+)?=>`,
    "m",
  ).exec(callText);
  if (arrowMatch) return parseParameterNames(arrowMatch[1]);

  const singleArrowMatch = new RegExp(
    `\\b(?:const|let|var)\\s+${escapedIdentifier}(?:\\s*:[^=]+)?\\s*=\\s*(?:async\\s*)?([A-Za-z_$][\\w$]*)(?:\\s*:\\s*[^=]+)?\\s*=>`,
    "m",
  ).exec(callText);
  if (singleArrowMatch) return [singleArrowMatch[1]];

  return [];
}

function parseParameterNames(parameterList: string | undefined): string[] {
  if (!parameterList) return [];

  return parameterList
    .split(",")
    .map((parameter) =>
      parameter
        .trim()
        .replace(/=.*/, "")
        .replace(/\?.*/, "")
        .replace(/:.*/, "")
        .trim(),
    )
    .filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseController(
  callText: string,
): { name?: string; alias?: string } | undefined {
  const stringValue = parseStringProperty(callText, "controller");
  if (stringValue) {
    const match = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(
      stringValue.trim(),
    );
    return match ? { name: match[1], alias: match[2] } : { name: stringValue };
  }

  const functionMatch =
    /\bcontroller\s*:\s*(?:async\s*)?function\s+([A-Za-z_$][\w$]*)/.exec(
      callText,
    );
  if (functionMatch) return { name: functionMatch[1] };

  const propertyMatch = /\bcontroller\s*:\s*([A-Za-z_$][\w$]*)/.exec(callText);
  if (propertyMatch) return { name: propertyMatch[1] };

  return undefined;
}

function parseStringProperty(callText: string, propertyName: string): string | undefined {
  const match = new RegExp(`\\b${propertyName}\\s*:\\s*(['"\`])`).exec(callText);
  if (!match) return undefined;

  const quote = match[1];
  let value = "";
  let escaped = false;
  const valueStart = match.index + match[0].length;

  for (let index = valueStart; index < callText.length; index++) {
    const char = callText[index];
    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === quote) return value;
    value += char;
  }

  return undefined;
}

function parseRequire(callText: string): string[] {
  const stringRequire = parseStringProperty(callText, "require");
  if (stringRequire) return [stringRequire];

  const arrayMatch = /\brequire\s*:\s*\[([\s\S]*?)\]/m.exec(callText);
  if (!arrayMatch) return [];

  const values: string[] = [];
  const stringRe = /(['"`])([^'"`]+)\1/g;
  let match: RegExpExecArray | null;
  while ((match = stringRe.exec(arrayMatch[1]))) values.push(match[2]);
  return values;
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
