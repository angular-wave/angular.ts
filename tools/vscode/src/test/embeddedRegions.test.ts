import test from "node:test";
import assert from "node:assert/strict";
import { builtInDirectives } from "../catalog/directives";
import {
  angularTsExpressionAtOffset,
  collectAngularTsEmbeddedRegions,
} from "../templates/embeddedRegions";

test("collects embedded AngularTS expression regions in HTML", () => {
  const text = `
    <section ng-if="ready | activeOnly" ng-class="{ active: ready }">
      {{ user.name | displayName }}
      <button ng-click="save(user)">Save</button>
      <ul>
        <li ng-repeat="user in users track by user.id">
          <select ng-options="item.id as item.name for item in options"></select>
        </li>
      </ul>
    </section>
  `;
  const regions = collectAngularTsEmbeddedRegions(text, builtInDirectives);

  assert.deepEqual(
    regions.map((region) => ({
      kind: region.kind,
      source: region.source,
      text: text.slice(region.start, region.end),
    })),
    [
      {
        kind: "directive-expression",
        source: "ng-if",
        text: "ready | activeOnly",
      },
      {
        kind: "filter-expression",
        source: "ng-if",
        text: "activeOnly",
      },
      {
        kind: "object-expression",
        source: "ng-class",
        text: "{ active: ready }",
      },
      {
        kind: "interpolation",
        source: undefined,
        text: " user.name | displayName ",
      },
      {
        kind: "filter-expression",
        source: "interpolation",
        text: "displayName",
      },
      {
        kind: "event-statement",
        source: "ng-click",
        text: "save(user)",
      },
      {
        kind: "repeat-expression",
        source: "ng-repeat",
        text: "user in users track by user.id",
      },
      {
        kind: "options-expression",
        source: "ng-options",
        text: "item.id as item.name for item in options",
      },
    ],
  );
});

test("skips embedded regions inside ng-non-bindable", () => {
  const text = `
    <section ng-non-bindable>
      {{ ignored | missing }}
      <button ng-click="ignored()">Ignored</button>
    </section>
    <button ng-click="save()">Save</button>
  `;
  const regions = collectAngularTsEmbeddedRegions(text, builtInDirectives);

  assert.deepEqual(
    regions.map((region) => ({
      kind: region.kind,
      source: region.source,
      text: text.slice(region.start, region.end),
    })),
    [
      {
        kind: "event-statement",
        source: "ng-click",
        text: "save()",
      },
    ],
  );
});

test("finds AngularTS expression regions at offsets", () => {
  const text = `<button ng-click="save(user)">{{ user.name | uppercase }}</button>`;
  const click = angularTsExpressionAtOffset(
    text,
    text.indexOf("save") + 1,
    builtInDirectives,
  );
  const interpolation = angularTsExpressionAtOffset(
    text,
    text.indexOf("user.name") + 1,
    builtInDirectives,
  );
  const filter = angularTsExpressionAtOffset(
    text,
    text.indexOf("uppercase") + 1,
    builtInDirectives,
  );

  assert.equal(click?.expression, "save(user)");
  assert.equal(click?.kind, "event-statement");
  assert.equal(interpolation?.expression, " user.name | uppercase ");
  assert.equal(interpolation?.kind, "interpolation");
  assert.equal(filter?.kind, "interpolation");
});
