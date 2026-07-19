import test from "node:test";
import assert from "node:assert/strict";
import { builtInDirectives, getBuiltInDirectiveByName } from "../catalog/directives";
import {
  directiveAttributeHtmlName,
  componentHtmlName,
  directiveHtmlName,
  directiveNormalize,
} from "../catalog/names";

test("directiveNormalize matches AngularTS directive name rules", () => {
  assert.equal(directiveNormalize("data-ng-some-directive"), "ngSomeDirective");
  assert.equal(directiveNormalize("ng-model"), "ngModel");
});

test("HTML names are generated from normalized directive/component names", () => {
  assert.equal(directiveHtmlName("ngModelOptions"), "ng-model-options");
  assert.equal(componentHtmlName("userCard"), "user-card");
});

test("directive attribute HTML names preserve supported prefixes", () => {
  assert.equal(directiveAttributeHtmlName("ngClick"), "ng-click");
  assert.equal(directiveAttributeHtmlName("data-ngClick"), "data-ng-click");
  assert.equal(directiveAttributeHtmlName("x:ngClick"), "x-ng-click");
});

test("built-in catalog includes important directive documentation entries", () => {
  const names = new Set(builtInDirectives.map((entry) => entry.htmlName));

  assert.ok(names.has("ng-app"));
  assert.ok(names.has("ng-model"));
  assert.ok(names.has("ng-repeat"));
  assert.ok(names.has("ng-click"));
  assert.ok(names.has("ng-get"));
  assert.ok(names.has("ng-state"));
  assert.ok(names.has("ng-inject"));

  const ngModel = getBuiltInDirectiveByName("ng-model");
  assert.equal(ngModel?.restrict, "A");
  assert.match(ngModel?.description ?? "", /ngFormDirectives/);
  assert.deepEqual(ngModel?.aliases, ["ng-model", "data-ng-model"]);
});

test("built-in catalog covers roadmap core directive groups", () => {
  const names = new Set(builtInDirectives.map((entry) => entry.htmlName));
  const required = [
    "ng-app",
    "ng-bind",
    "ng-bind-html",
    "ng-bind-template",
    "ng-class",
    "ng-cloak",
    "ng-controller",
    "ng-if",
    "ng-include",
    "ng-init",
    "ng-listener",
    "ng-model",
    "ng-model-options",
    "ng-non-bindable",
    "ng-options",
    "ng-repeat",
    "ng-show",
    "ng-hide",
    "ng-style",
    "ng-switch",
    "ng-switch-when",
    "ng-switch-default",
    "ng-transclude",
    "ng-ref",
    "ng-ref-read",
    "ng-scope",
    "ng-setter",
    "ng-state",
    "ng-state-active",
    "ng-state-active-exact",
    "ng-view",
    "ng-get",
    "ng-post",
    "ng-sse",
    "ng-viewport",
    "ng-wasm",
    "ng-worker",
    "ng-web-transport",
    "ng-required",
    "ng-minlength",
    "ng-maxlength",
    "ng-click",
  ];

  assert.deepEqual(
    required.filter((name) => !names.has(name)),
    [],
  );
});

test("built-in directive catalog stores editor metadata for every directive", () => {
  const incomplete = builtInDirectives.filter(
    (entry) =>
      !entry.name ||
      !entry.aliases.length ||
      !entry.allowedLocations?.length ||
      !entry.expressionKind ||
      entry.valueRequired === undefined ||
      !entry.example ||
      !entry.examples?.length ||
      !entry.source?.file ||
      !entry.requiredCompanionAttributes ||
      !entry.conflictingAttributes,
  );

  assert.deepEqual(
    incomplete.map((entry) => entry.htmlName ?? entry.name),
    [],
  );
});

test("built-in directive metadata describes expressions, companions, and conflicts", () => {
  assert.equal(getBuiltInDirectiveByName("ng-model")?.expressionKind, "model");
  assert.equal(getBuiltInDirectiveByName("ng-repeat")?.expressionKind, "repeat");
  assert.equal(getBuiltInDirectiveByName("ng-options")?.expressionKind, "options");
  assert.equal(getBuiltInDirectiveByName("ng-click")?.expressionKind, "statement");
  assert.equal(getBuiltInDirectiveByName("ng-click")?.eventType, "MouseEvent");
  assert.equal(getBuiltInDirectiveByName("ng-keydown")?.eventType, "KeyboardEvent");
  assert.equal(getBuiltInDirectiveByName("ng-if")?.eventType, undefined);
  assert.equal(getBuiltInDirectiveByName("ng-if")?.expressionKind, "expression");
  assert.deepEqual(
    getBuiltInDirectiveByName("ng-switch-when")?.requiredCompanionAttributes,
    ["ng-switch"],
  );
  assert.deepEqual(getBuiltInDirectiveByName("ng-show")?.conflictingAttributes, [
    "ng-hide",
  ]);
});

test("built-in directive catalog has a stable generated metadata snapshot", () => {
  const snapshotNames = [
    "ng-app",
    "ng-model",
    "ng-repeat",
    "ng-options",
    "ng-click",
    "ng-state",
    "ng-ref-read",
    "ng-html-canvas-source",
  ];

  assert.deepEqual(
    snapshotNames.map((name) => {
      const entry = getBuiltInDirectiveByName(name);

      return {
        name: entry?.htmlName,
        aliases: entry?.aliases,
        locations: entry?.allowedLocations,
        expression: entry?.expressionKind,
        eventType: entry?.eventType,
        required: entry?.requiredCompanionAttributes,
        conflicts: entry?.conflictingAttributes,
      };
    }),
    [
      {
        name: "ng-app",
        aliases: ["ng-app", "data-ng-app"],
        locations: ["attribute"],
        expression: "controller",
        eventType: undefined,
        required: [],
        conflicts: [],
      },
      {
        name: "ng-model",
        aliases: ["ng-model", "data-ng-model"],
        locations: ["attribute"],
        expression: "model",
        eventType: undefined,
        required: [],
        conflicts: [],
      },
      {
        name: "ng-repeat",
        aliases: ["ng-repeat", "data-ng-repeat"],
        locations: ["attribute"],
        expression: "repeat",
        eventType: undefined,
        required: [],
        conflicts: [],
      },
      {
        name: "ng-options",
        aliases: ["ng-options", "data-ng-options"],
        locations: ["attribute"],
        expression: "options",
        eventType: undefined,
        required: [],
        conflicts: [],
      },
      {
        name: "ng-click",
        aliases: ["ng-click", "data-ng-click"],
        locations: ["attribute"],
        expression: "statement",
        eventType: "MouseEvent",
        required: [],
        conflicts: [],
      },
      {
        name: "ng-state",
        aliases: ["ng-state", "data-ng-state"],
        locations: ["attribute"],
        expression: "controller",
        eventType: undefined,
        required: [],
        conflicts: [],
      },
      {
        name: "ng-ref-read",
        aliases: ["ng-ref-read", "data-ng-ref-read"],
        locations: ["attribute"],
        expression: "string",
        eventType: undefined,
        required: ["ng-ref"],
        conflicts: [],
      },
      {
        name: "ng-html-canvas-source",
        aliases: ["ng-html-canvas-source", "data-ng-html-canvas-source"],
        locations: ["attribute"],
        expression: "string",
        eventType: undefined,
        required: ["ng-html-canvas"],
        conflicts: [],
      },
    ],
  );
});

test("built-in catalog is generated with only supported aliases and restricts", () => {
  assert.equal(
    builtInDirectives.some((entry) =>
      entry.aliases.some((alias) => alias.startsWith("x-")),
    ),
    false,
  );
  assert.equal(
    builtInDirectives.some((entry) =>
      entry.allowedLocations?.some(
        (location) => location !== "attribute" && location !== "element",
      ),
    ),
    false,
  );
});
