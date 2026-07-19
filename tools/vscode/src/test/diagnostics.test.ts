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

test("diagnoses camelCase directive attributes and recommends kebab-case", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<button ngClick="save()" data-ngShow="ready"></button>`,
    builtInDirectives,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["camelCaseDirectiveAttribute", "camelCaseDirectiveAttribute"],
  );
  assert.match(diagnostics[0].message, /ng-click/);
  assert.match(diagnostics[1].message, /data-ng-show/);
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

test("ignores diagnostics inside ng-non-bindable subtrees", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<section ng-non-bindable>
       <button ng-missing="value">{{ user.name | missingFilter }}</button>
       <p>{{ user.name }}</p>
     </section>
     <p>{{ user.name | missingFilter }}</p>`,
    [...builtInDirectives, ...builtInFilters],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownFilter"],
  );
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

test("diagnoses chained filters with arguments and ignores non-filter pipes", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<p>{{ fallback || "literal | value" | currency:"en-US" | missingFilter:1 }}</p>`,
    [...builtInDirectives, ...builtInFilters],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownFilter"],
  );
  assert.match(diagnostics[0].message, /missingFilter/);
});

test("diagnoses missing required directive expression values", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<section ng-if></section><section ng-show=""></section><section ng-cloak></section>`,
    [...builtInDirectives, ...builtInFilters],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["missingDirectiveValue", "missingDirectiveValue"],
  );
  assert.match(diagnostics[0].message, /ng-if/);
  assert.match(diagnostics[1].message, /ng-show/);
});

test("diagnoses malformed interpolation expressions", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<p>{{ user.name }}</p><p>{{ save(user }}</p><p>{{ }}</p>`,
    [...builtInDirectives, ...builtInFilters],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    [
      "malformedInterpolationExpression",
      "malformedInterpolationExpression",
    ],
  );
  assert.match(diagnostics[0].message, /Unclosed/);
  assert.match(diagnostics[1].message, /empty/);
});

test("diagnoses unclosed interpolation expressions", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<p>{{ user.name</p>`,
    [...builtInDirectives, ...builtInFilters],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["malformedInterpolationExpression"],
  );
  assert.match(diagnostics[0].message, /missing closing/);
});

test("diagnoses malformed directive expressions in HTML", () => {
  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<button ng-click="save(user"></button><section ng-if="ready"></section>`,
    [...builtInDirectives, ...builtInFilters],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["malformedDirectiveExpression"],
  );
  assert.match(diagnostics[0].message, /ng-click/);
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

test("diagnoses literal ng-state routes and params against route catalog", () => {
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "admin.profile",
    normalizedName: "admin.profile",
    aliases: [],
    description: "Fixture route",
    routeParams: [
      { name: "userId", optional: false },
      { name: "tab", optional: true },
    ],
  };

  const diagnostics = collectAngularTsHtmlDiagnostics(
    `
      <a ng-state="'admin.missing'"></a>
      <a ng-state="'admin.profile'"></a>
      <a ng-state="'admin.profile'" ng-state-params="{ userId: user.id, extra: true }"></a>
      <a ng-state="dynamicRoute" ng-state-params="dynamicParams"></a>
    `,
    [...builtInDirectives, route],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownRoute", "missingRouteParam", "unknownRouteParam"],
  );
  assert.match(diagnostics[0].message, /admin\.missing/);
  assert.match(diagnostics[1].message, /userId/);
  assert.match(diagnostics[2].message, /extra/);
});

test("accepts literal ng-state when required params are provided", () => {
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "admin.profile",
    normalizedName: "admin.profile",
    aliases: [],
    description: "Fixture route",
    routeParams: [
      { name: "userId", optional: false },
      { name: "tab", optional: true },
    ],
  };

  const diagnostics = collectAngularTsHtmlDiagnostics(
    `<a ng-state="'admin.profile'" ng-state-params="{ userId: user.id }"></a>`,
    [...builtInDirectives, route],
  );

  assert.deepEqual(diagnostics, []);
});
