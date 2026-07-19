import * as fs from "node:fs";
import * as path from "node:path";
import type { AngularTsCatalogEntry, AngularTsExpressionKind } from "./types";
import { directiveAliases, directiveHtmlName, directiveNormalize } from "./names";

const DIRECTIVE_GROUP_RE =
  /\/\*\*([\s\S]*?)\*\/\s*export const (ng\w+Directives)\s*=\s*\{([\s\S]*?)\}\s*satisfies\s+DirectiveGroup/g;
const DIRECTIVE_PROPERTY_RE = /^\s*([A-Za-z_$][\w$]*)\s*:/gm;
const EVENT_NAMES_RE = /const EVENT_NAMES\s*=\s*\[([\s\S]*?)\]\s*as const/;
const STRING_RE = /["']([^"']+)["']/g;
const ALIASED_ATTR_RE =
  /export const ALIASED_ATTR:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/;
const BOOLEAN_ATTR_RE = /export const BOOLEAN_ATTR\s*=\s*\[([\s\S]*?)\];/;
const DIRECTIVE_RESTRICT_RE =
  /export type DirectiveRestrict\s*=\s*([^;]+);/;

interface DirectiveMetadata {
  expressionKind: AngularTsExpressionKind;
  valueRequired: boolean;
  example: string;
  requiredCompanionAttributes: string[];
  conflictingAttributes: string[];
  eventType?: string;
  detail?: string;
}

export interface BuiltInCatalogSource {
  repoRoot: string;
  namespaceSource: string;
  ngSource: string;
  eventsSource: string;
  attrsSource: string;
  constantsSource: string;
  domSource: string;
  interfaceSource: string;
  runtimeSource: string;
  refSource: string;
}

export const builtInDirectives = loadBuiltInDirectives();

export function loadBuiltInDirectives(
  repoRoot = findRepoRoot(),
): AngularTsCatalogEntry[] {
  const source = readBuiltInCatalogSource(repoRoot);
  return createBuiltInDirectiveCatalog(source);
}

export function createBuiltInDirectiveCatalog(
  source: BuiltInCatalogSource,
): AngularTsCatalogEntry[] {
  const restrictValues = parseDirectiveRestrictValues(
    source.namespaceSource,
    source.interfaceSource,
  );
  const entries = new Map<string, AngularTsCatalogEntry>();

  for (const group of parseDirectiveGroups(source.ngSource)) {
    for (const directiveName of group.directiveNames) {
      addDirective(entries, {
        name: directiveName,
        description: `${group.description} (${group.name})`,
        sourceFile: "src/ng.ts",
        sourceText: source.ngSource,
        sourceOffset: group.offsets.get(directiveName),
        restrict: inferRestrict(directiveName, restrictValues),
      });
    }
  }

  for (const eventName of parseStringArray(source.eventsSource, EVENT_NAMES_RE)) {
    addDirective(entries, {
      name: directiveNormalize(`ng-${eventName}`),
      description: "Event directive generated from src/directive/events/events.ts.",
      sourceFile: "src/directive/events/events.ts",
      sourceText: source.eventsSource,
      restrict: "A",
    });
  }

  for (const attrName of parseAttributeAliasDirectiveNames(source)) {
    addDirective(entries, {
      name: attrName,
      description: "Attribute alias directive generated from src/directive/attrs/attrs.ts.",
      sourceFile: "src/directive/attrs/attrs.ts",
      sourceText: source.attrsSource,
      restrict: "A",
    });
  }

  addDirective(entries, {
    name: "ngApp",
    description:
      "AngularTS bootstrap directive discovered by the auto runtime before module compilation.",
    sourceFile: "src/angular-runtime.ts",
    sourceText: source.runtimeSource,
    sourceOffset: source.runtimeSource.indexOf("ng-app"),
    restrict: "A",
  });

  addDirective(entries, {
    name: "ngRefRead",
    description:
      "Companion attribute for ng-ref that selects whether the assigned value is the element or a named controller.",
    sourceFile: "src/directive/ref/ref.ts",
    sourceText: source.refSource,
    sourceOffset: source.refSource.indexOf("ngRefRead"),
    restrict: "A",
  });

  addDirective(entries, {
    name: "ngHtmlCanvasSource",
    description:
      "Companion attribute for ng-html-canvas that declares a native HTML-in-Canvas source subtree.",
    sourceFile: "src/directive/html-canvas/html-canvas.ts",
    sourceText: source.ngSource,
    restrict: "A",
  });

  addDirective(entries, {
    name: "ngStateParams",
    description:
      "Companion attribute for ng-state that supplies route parameters.",
    sourceFile: "src/router/directives/state-directives.ts",
    sourceText: source.ngSource,
    sourceOffset: source.ngSource.indexOf("ngStateParams"),
    restrict: "A",
  });

  addDirective(entries, {
    name: "ngStateOpts",
    description:
      "Companion attribute for ng-state that supplies transition options.",
    sourceFile: "src/router/directives/state-directives.ts",
    sourceText: source.ngSource,
    sourceOffset: source.ngSource.indexOf("ngStateOpts"),
    restrict: "A",
  });

  return Array.from(entries.values()).sort((left, right) =>
    (left.htmlName ?? left.name).localeCompare(right.htmlName ?? right.name),
  );
}

function readBuiltInCatalogSource(repoRoot: string): BuiltInCatalogSource {
  return {
    repoRoot,
    namespaceSource: readSource(repoRoot, "src/namespace.ts"),
    ngSource: readSource(repoRoot, "src/ng.ts"),
    eventsSource: readSource(repoRoot, "src/directive/events/events.ts"),
    attrsSource: readSource(repoRoot, "src/directive/attrs/attrs.ts"),
    constantsSource: readSource(repoRoot, "src/shared/constants.ts"),
    domSource: readSource(repoRoot, "src/shared/dom.ts"),
    interfaceSource: readSource(repoRoot, "src/interface.ts"),
    runtimeSource: readSource(repoRoot, "src/angular-runtime.ts"),
    refSource: readSource(repoRoot, "src/directive/ref/ref.ts"),
  };
}

function parseDirectiveGroups(source: string): Array<{
  name: string;
  description: string;
  directiveNames: string[];
  offsets: Map<string, number>;
}> {
  const groups: Array<{
    name: string;
    description: string;
    directiveNames: string[];
    offsets: Map<string, number>;
  }> = [];
  let match: RegExpExecArray | null;

  while ((match = DIRECTIVE_GROUP_RE.exec(source))) {
    const comment = normalizeJSDoc(match[1]);
    const groupName = match[2];
    const body = match[3];
    const bodyStart = match.index + match[0].indexOf(body);
    const directiveNames: string[] = [];
    const offsets = new Map<string, number>();
    let propertyMatch: RegExpExecArray | null;

    while ((propertyMatch = DIRECTIVE_PROPERTY_RE.exec(body))) {
      const directiveName = propertyMatch[1];
      directiveNames.push(directiveName);
      offsets.set(directiveName, bodyStart + propertyMatch.index);
    }

    groups.push({
      name: groupName,
      description: comment || "Built-in AngularTS directives.",
      directiveNames,
      offsets,
    });
  }

  return groups;
}

function parseAttributeAliasDirectiveNames(source: BuiltInCatalogSource): string[] {
  const names = new Set<string>();
  const booleanAttrs = parseStringArray(source.domSource, BOOLEAN_ATTR_RE);
  const aliasedAttrs = parseObjectKeys(source.constantsSource, ALIASED_ATTR_RE);

  for (const attr of booleanAttrs) {
    if (attr !== "multiple") names.add(directiveNormalize(`ng-${attr}`));
  }

  for (const attr of aliasedAttrs) names.add(attr);
  for (const attr of ["src", "srcset", "href"]) {
    names.add(directiveNormalize(`ng-${attr}`));
  }

  return Array.from(names);
}

function addDirective(
  entries: Map<string, AngularTsCatalogEntry>,
  input: {
    name: string;
    description: string;
    sourceFile: string;
    sourceText: string;
    sourceOffset?: number;
    restrict: "A" | "E" | "AE" | "EA";
  },
): void {
  const normalizedName = directiveNormalize(input.name);
  if (entries.has(normalizedName)) return;

  const htmlName = directiveHtmlName(input.name);
  const metadata = directiveMetadata(normalizedName, htmlName);
  const sourceLocation =
    input.sourceOffset === undefined
      ? undefined
      : offsetToLocation(input.sourceText, input.sourceOffset);

  entries.set(normalizedName, {
    kind: "directive",
    name: normalizedName,
    normalizedName,
    htmlName,
    aliases: aliasesForDirective(input.name, htmlName),
    description: input.description,
    restrict: input.restrict,
    allowedLocations: restrictToAllowedLocations(input.restrict),
    expressionKind: metadata.expressionKind,
    valueRequired: metadata.valueRequired,
    example: metadata.example,
    examples: [metadata.example],
    requiredCompanionAttributes: metadata.requiredCompanionAttributes,
    conflictingAttributes: metadata.conflictingAttributes,
    eventType: metadata.eventType,
    source: {
      file: input.sourceFile,
      line: sourceLocation?.line,
      character: sourceLocation?.character,
    },
    detail: metadata.detail,
  });
}

function directiveMetadata(
  normalizedName: string,
  htmlName: string,
): DirectiveMetadata {
  const expressionKind = directiveExpressionKind(normalizedName, htmlName);
  const valueRequired = expressionKind !== "none";
  const requiredCompanionAttributes = companionAttributes(normalizedName);
  const conflictingAttributes = conflictingAttributesFor(normalizedName);
  const eventType = eventTypeForDirective(normalizedName);

  return {
    expressionKind,
    valueRequired,
    example: directiveExample(normalizedName, htmlName, expressionKind),
    requiredCompanionAttributes,
    conflictingAttributes,
    eventType,
    detail: directiveDetail(expressionKind, requiredCompanionAttributes, eventType),
  };
}

function directiveExpressionKind(
  normalizedName: string,
  htmlName: string,
): AngularTsExpressionKind {
  if (normalizedName === "ngModel") return "model";
  if (normalizedName === "ngRepeat") return "repeat";
  if (normalizedName === "ngOptions") return "options";
  if (
    normalizedName === "ngController" ||
    normalizedName === "ngApp" ||
    normalizedName === "ngView" ||
    normalizedName === "ngState"
  ) {
    return "controller";
  }
  if (
    normalizedName === "ngInclude" ||
    normalizedName === "ngMessagesInclude"
  ) {
    return "template-url";
  }
  if (
    normalizedName === "ngInit" ||
    normalizedName === "ngSubmit" ||
    htmlName.startsWith("ng-on-") ||
    isEventDirective(normalizedName)
  ) {
    return "statement";
  }
  if (
    normalizedName === "ngModelOptions" ||
    normalizedName === "ngStateParams" ||
    normalizedName === "ngStateOpts" ||
    normalizedName === "ngStyle" ||
    normalizedName === "ngClass"
  ) {
    return "json";
  }
  if (
    normalizedName === "ngCloak" ||
    normalizedName === "ngNonBindable" ||
    normalizedName === "ngSwitchDefault" ||
    normalizedName === "required" ||
    normalizedName === "multiple"
  ) {
    return "none";
  }
  if (
    normalizedName === "ngBindTemplate" ||
    normalizedName === "ngHtmlCanvas" ||
    normalizedName === "ngHtmlCanvasSource" ||
    normalizedName === "ngHtmlCanvasInvalidate" ||
    normalizedName === "ngRefRead"
  ) {
    return "string";
  }

  return "expression";
}

function isEventDirective(normalizedName: string): boolean {
  return /^ng[A-Z].+/.test(normalizedName) && [
    "ngAbort",
    "ngAuxclick",
    "ngBlur",
    "ngCancel",
    "ngCanplay",
    "ngCanplaythrough",
    "ngChange",
    "ngClick",
    "ngClose",
    "ngContextmenu",
    "ngCopy",
    "ngCuechange",
    "ngCut",
    "ngDblclick",
    "ngDrag",
    "ngDragend",
    "ngDragenter",
    "ngDragleave",
    "ngDragover",
    "ngDragstart",
    "ngDrop",
    "ngDurationchange",
    "ngEmptied",
    "ngEnded",
    "ngError",
    "ngFocus",
    "ngInput",
    "ngInvalid",
    "ngKeydown",
    "ngKeypress",
    "ngKeyup",
    "ngLoad",
    "ngLoadeddata",
    "ngLoadedmetadata",
    "ngLoadstart",
    "ngMousedown",
    "ngMouseenter",
    "ngMouseleave",
    "ngMousemove",
    "ngMouseout",
    "ngMouseover",
    "ngMouseup",
    "ngPaste",
    "ngPause",
    "ngPlay",
    "ngPlaying",
    "ngProgress",
    "ngRatechange",
    "ngReset",
    "ngResize",
    "ngScroll",
    "ngScrollend",
    "ngSecuritypolicyviolation",
    "ngSeeked",
    "ngSeeking",
    "ngSelect",
    "ngSlotchange",
    "ngStalled",
    "ngSubmit",
    "ngSuspend",
    "ngTimeupdate",
    "ngToggle",
    "ngVolumechange",
    "ngWaiting",
    "ngWheel",
  ].includes(normalizedName);
}

function eventTypeForDirective(normalizedName: string): string | undefined {
  if (!isEventDirective(normalizedName)) return undefined;

  switch (normalizedName) {
    case "ngBlur":
    case "ngFocus":
      return "FocusEvent";
    case "ngCopy":
    case "ngCut":
    case "ngPaste":
      return "ClipboardEvent";
    case "ngClick":
    case "ngDblclick":
    case "ngMousedown":
    case "ngMouseenter":
    case "ngMouseleave":
    case "ngMousemove":
    case "ngMouseout":
    case "ngMouseover":
    case "ngMouseup":
      return "MouseEvent";
    case "ngKeydown":
    case "ngKeypress":
    case "ngKeyup":
      return "KeyboardEvent";
    case "ngInput":
      return "InputEvent";
    case "ngSubmit":
      return "SubmitEvent";
    case "ngTouchstart":
    case "ngTouchend":
    case "ngTouchmove":
      return "TouchEvent";
    default:
      return "Event";
  }
}

function companionAttributes(normalizedName: string): string[] {
  switch (normalizedName) {
    case "ngMessage":
    case "ngMessageExp":
    case "ngMessageDefault":
      return ["ng-messages"];
    case "ngSwitchWhen":
    case "ngSwitchDefault":
      return ["ng-switch"];
    case "ngHtmlCanvasSource":
    case "ngHtmlCanvasInvalidate":
      return ["ng-html-canvas"];
    case "ngRefRead":
      return ["ng-ref"];
    default:
      return [];
  }
}

function conflictingAttributesFor(normalizedName: string): string[] {
  switch (normalizedName) {
    case "ngShow":
      return ["ng-hide"];
    case "ngHide":
      return ["ng-show"];
    case "ngSwitchWhen":
      return ["ng-switch-default"];
    case "ngSwitchDefault":
      return ["ng-switch-when"];
    default:
      return [];
  }
}

function directiveExample(
  normalizedName: string,
  htmlName: string,
  expressionKind: AngularTsExpressionKind,
): string {
  switch (normalizedName) {
    case "ngModel":
      return '<input ng-model="user.name">';
    case "ngRepeat":
      return '<li ng-repeat="item in items">{{ item.name }}</li>';
    case "ngOptions":
      return '<select ng-model="selected" ng-options="item.id as item.name for item in items"></select>';
    case "ngController":
      return '<section ng-controller="UserController as $ctrl"></section>';
    case "ngInclude":
      return '<section ng-include="templateUrl"></section>';
    case "ngClick":
      return '<button ng-click="save(user)">Save</button>';
    case "ngState":
      return '<a ng-state="app.user" data-state-active data-state-exact>User</a>';
    case "ngView":
      return "<ng-view></ng-view>";
    default:
      break;
  }

  if (expressionKind === "none") return `<div ${htmlName}></div>`;
  if (expressionKind === "statement") return `<button ${htmlName}="run()">Run</button>`;
  if (expressionKind === "model") return `<input ${htmlName}="value">`;
  if (expressionKind === "template-url") return `<div ${htmlName}="templateUrl"></div>`;
  if (expressionKind === "controller") return `<div ${htmlName}="Name"></div>`;
  if (expressionKind === "json") return `<div ${htmlName}="{ active: isActive }"></div>`;
  if (expressionKind === "string") return `<div ${htmlName}="value"></div>`;
  return `<div ${htmlName}="expression"></div>`;
}

function directiveDetail(
  expressionKind: AngularTsExpressionKind,
  requiredCompanionAttributes: string[],
  eventType?: string,
): string {
  const parts = [`Expression kind: ${expressionKind}.`];
  if (requiredCompanionAttributes.length > 0) {
    parts.push(`Requires: ${requiredCompanionAttributes.join(", ")}.`);
  }
  if (eventType) {
    parts.push(`Provides $event: ${eventType}.`);
  }
  return parts.join(" ");
}

function aliasesForDirective(name: string, htmlName: string): string[] {
  if (/^ng[A-Z]/.test(name)) return directiveAliases(htmlName);
  return [htmlName];
}

function inferRestrict(
  directiveName: string,
  restrictValues: Set<string>,
): "A" | "E" | "AE" | "EA" {
  if (["input", "textarea", "form", "script", "select", "option"].includes(directiveName)) {
    return restrictValues.has("E") ? "E" : "A";
  }

  if (directiveName === "ngView") {
    return restrictValues.has("AE") ? "AE" : "A";
  }

  return restrictValues.has("A") ? "A" : "A";
}

function restrictToAllowedLocations(
  restrict: "A" | "E" | "AE" | "EA",
): Array<"attribute" | "element"> {
  const locations: Array<"attribute" | "element"> = [];
  if (restrict.includes("A")) locations.push("attribute");
  if (restrict.includes("E")) locations.push("element");
  return locations;
}

function parseDirectiveRestrictValues(
  namespaceSource: string,
  interfaceSource: string,
): Set<string> {
  if (!namespaceSource.includes("export type DirectiveRestrict = TDirectiveRestrict")) {
    return new Set(["A"]);
  }

  const match = DIRECTIVE_RESTRICT_RE.exec(interfaceSource);
  const values = new Set<string>();
  if (!match) return new Set(["A", "E", "AE", "EA"]);

  let stringMatch: RegExpExecArray | null;
  STRING_RE.lastIndex = 0;
  while ((stringMatch = STRING_RE.exec(match[1]))) values.add(stringMatch[1]);
  return values;
}

function parseStringArray(source: string, pattern: RegExp): string[] {
  const match = pattern.exec(source);
  if (!match) return [];

  const values: string[] = [];
  let stringMatch: RegExpExecArray | null;
  STRING_RE.lastIndex = 0;
  while ((stringMatch = STRING_RE.exec(match[1]))) values.push(stringMatch[1]);
  return values;
}

function parseObjectKeys(source: string, pattern: RegExp): string[] {
  const match = pattern.exec(source);
  if (!match) return [];

  const keys: string[] = [];
  const keyRe = /^\s*([A-Za-z_$][\w$]*)\s*:/gm;
  let keyMatch: RegExpExecArray | null;
  while ((keyMatch = keyRe.exec(match[1]))) keys.push(keyMatch[1]);
  return keys;
}

function normalizeJSDoc(comment: string): string {
  return comment
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean)
    .join(" ");
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

function readSource(repoRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function findRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(__dirname, "../../../.."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "src/namespace.ts"))) {
      return candidate;
    }
  }

  return process.cwd();
}

export function getBuiltInDirectiveByName(
  name: string,
): AngularTsCatalogEntry | undefined {
  const normalized = directiveNormalize(name);
  return builtInDirectives.find((entry) => entry.normalizedName === normalized);
}
