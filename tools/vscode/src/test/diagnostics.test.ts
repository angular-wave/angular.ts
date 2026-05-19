import test from "node:test";
import assert from "node:assert/strict";
import { collectAngularTsHtmlDiagnostics } from "../templates/diagnostics";
import { builtInDirectives } from "../catalog/directives";
import { builtInFilters } from "../catalog/filters";
import type { AngularTsCatalogEntry } from "../catalog/types";

test("diagnoses unknown AngularTS directive attributes", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<section ng-if="ready" ng-missing="value"></section>`,
    builtInDirectives,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownDirective"],
  );
  assert.match(diagnostics[0].message, /ng-missing/);
});

test("diagnoses unknown filters in interpolation expressions", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<p>{{ total | currency }} {{ name | missingFilter }}</p>`,
    [...builtInDirectives, ...builtInFilters],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownFilter"],
  );
  assert.match(diagnostics[0].message, /missingFilter/);
});

test("accepts custom filters in interpolation expressions", () => {
  const customFilter: AngularTsCatalogEntry = {
    kind: "filter",
    name: "activeOnly",
    normalizedName: "activeOnly",
    aliases: [],
    description: "Fixture custom filter",
  };

  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<p>{{ users | activeOnly }}</p>`,
    [...builtInDirectives, ...builtInFilters, customFilter],
  );

  assert.deepEqual(diagnostics, []);
});

test("diagnoses unknown bindings only on known components", () => {
  const component: AngularTsCatalogEntry = {
    kind: "component",
    name: "userCard",
    normalizedName: "userCard",
    htmlName: "user-card",
    aliases: ["user-card"],
    description: "Fixture component",
    bindings: [{ name: "user", mode: "<", optional: false }],
  };

  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<user-card user="vm.user" missing-binding="1"></user-card><other-card missing-binding="1"></other-card>`,
    [...builtInDirectives, component],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownBinding"],
  );
  assert.match(diagnostics[0].message, /missing-binding/);
});

test("diagnoses known directives used in unsupported locations", () => {
  const attributeOnly: AngularTsCatalogEntry = {
    kind: "directive",
    name: "activeWhen",
    normalizedName: "activeWhen",
    htmlName: "active-when",
    aliases: ["active-when"],
    allowedLocations: ["attribute"],
    description: "Fixture attribute directive",
  };
  const elementOnly: AngularTsCatalogEntry = {
    kind: "directive",
    name: "panelBox",
    normalizedName: "panelBox",
    htmlName: "panel-box",
    aliases: ["panel-box"],
    allowedLocations: ["element"],
    description: "Fixture element directive",
  };

  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<active-when></active-when><section panel-box></section>`,
    [...builtInDirectives, attributeOnly, elementOnly],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["invalidDirectiveLocation", "invalidDirectiveLocation"],
  );
});

test("diagnoses unknown controllers in ng-controller values", () => {
  const controller: AngularTsCatalogEntry = {
    kind: "controller",
    name: "KnownController",
    normalizedName: "KnownController",
    aliases: [],
    description: "Fixture controller",
  };

  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<section ng-controller="MissingController as vm"></section><section ng-controller="KnownController"></section>`,
    [...builtInDirectives, controller],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownController"],
  );
  assert.match(diagnostics[0].message, /MissingController/);
});
