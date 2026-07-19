import test from "node:test";
import assert from "node:assert/strict";
import {
  attributeNameAt,
  filterNameAt,
  getAttributeCompletionContext,
  getExpressionIdentifierCompletionContext,
  getFilterCompletionContext,
  getTagCompletionContext,
} from "../templates/context";

test("detects HTML attribute completion context", () => {
  assert.deepEqual(getAttributeCompletionContext("<div ng-"), {
    rangeStart: 5,
    prefix: "ng-",
    tagName: "div",
    attributeNames: ["ng-"],
  });

  assert.deepEqual(getAttributeCompletionContext("<user-card "), {
    rangeStart: 11,
    prefix: "",
    tagName: "user-card",
    attributeNames: [],
  });
});

test("ignores closing tags and attribute values", () => {
  assert.equal(getAttributeCompletionContext("</div ng-"), undefined);
  assert.equal(getAttributeCompletionContext("<div title=\"ng-"), undefined);
});

test("finds attribute names at offsets", () => {
  const text = "<button ng-click=\"save()\"></button>";
  const offset = text.indexOf("click");
  const attr = attributeNameAt(text, offset);

  assert.equal(attr?.name, "ng-click");
  assert.equal(text.slice(attr?.start, attr?.end), "ng-click");
});

test("detects interpolation filter completion context", () => {
  assert.deepEqual(getFilterCompletionContext("{{ total | cur"), {
    rangeStart: 11,
    prefix: "cur",
  });

  assert.equal(getFilterCompletionContext("{{ total "), undefined);
  assert.equal(getFilterCompletionContext("{{ total | currency }} "), undefined);
  assert.equal(getFilterCompletionContext("{{ ready || cur"), undefined);
  assert.equal(getFilterCompletionContext("{{ label + ' | cur'"), undefined);
  assert.deepEqual(getFilterCompletionContext("{{ users | activeOnly:true | ord"), {
    rangeStart: 29,
    prefix: "ord",
  });
});

test("detects expression identifier completion context", () => {
  assert.deepEqual(getExpressionIdentifierCompletionContext("{{ Use"), {
    rangeStart: 3,
    prefix: "Use",
  });

  assert.deepEqual(
    getExpressionIdentifierCompletionContext('<button ng-click="save(Use'),
    {
      rangeStart: 23,
      prefix: "Use",
    },
  );

  assert.equal(
    getExpressionIdentifierCompletionContext("{{ total | cur"),
    undefined,
  );
  assert.equal(
    getExpressionIdentifierCompletionContext("<div title=\"Use"),
    undefined,
  );
});

test("detects tag completion context", () => {
  assert.deepEqual(getTagCompletionContext("<user"), {
    rangeStart: 1,
    prefix: "user",
  });

  assert.deepEqual(getTagCompletionContext("<"), {
    rangeStart: 1,
    prefix: "",
  });

  assert.equal(getTagCompletionContext("</user"), undefined);
  assert.equal(getTagCompletionContext("<user "), undefined);
});

test("finds filter names at offsets", () => {
  const text = "<p>{{ total | currency : '$' }}</p>";
  const offset = text.indexOf("curr") + 2;
  const filter = filterNameAt(text, offset);

  assert.equal(filter?.name, "currency");
  assert.equal(text.slice(filter?.start, filter?.end), "currency");
});

test("finds chained filter names and ignores non-filter pipes", () => {
  const text = `<p>{{ users | activeOnly:true | orderBy:"name" || fallback }}</p>`;
  const active = filterNameAt(text, text.indexOf("active") + 2);
  const orderBy = filterNameAt(text, text.indexOf("order") + 2);
  const fallback = filterNameAt(text, text.indexOf("fallback") + 2);

  assert.equal(active?.name, "activeOnly");
  assert.equal(orderBy?.name, "orderBy");
  assert.equal(fallback, undefined);
});
