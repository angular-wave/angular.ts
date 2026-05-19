import test from "node:test";
import assert from "node:assert/strict";
import { builtInDirectives, getBuiltInDirectiveByName } from "../catalog/directives";
import {
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

test("built-in catalog includes important directive documentation entries", () => {
  const names = new Set(builtInDirectives.map((entry) => entry.htmlName));

  assert.ok(names.has("ng-model"));
  assert.ok(names.has("ng-repeat"));
  assert.ok(names.has("ng-click"));
  assert.ok(names.has("ng-get"));
  assert.ok(names.has("ng-sref"));
  assert.ok(names.has("ng-inject"));

  const ngModel = getBuiltInDirectiveByName("ng-model");
  assert.equal(ngModel?.restrict, "A");
  assert.match(ngModel?.description ?? "", /ngFormDirectives/);
  assert.deepEqual(ngModel?.aliases, ["ng-model", "data-ng-model"]);
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
