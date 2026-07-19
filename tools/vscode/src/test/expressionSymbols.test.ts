import test from "node:test";
import assert from "node:assert/strict";
import {
  collectExpressionIdentifiers,
  expressionIdentifierAt,
} from "../templates/expressionSymbols";

test("collects AngularTS expression identifiers and dotted paths", () => {
  const expression = `$ctrl.save(user.name, items[index], { active: ready })`;
  const identifiers = collectExpressionIdentifiers(expression, 10);

  assert.deepEqual(
    identifiers.map((identifier) => ({
      name: identifier.name,
      path: identifier.path,
      text: expression.slice(identifier.start - 10, identifier.end - 10),
    })),
    [
      { name: "$ctrl", path: ["$ctrl", "save"], text: "$ctrl.save" },
      { name: "user", path: ["user", "name"], text: "user.name" },
      { name: "items", path: ["items"], text: "items" },
      { name: "index", path: ["index"], text: "index" },
      { name: "active", path: ["active"], text: "active" },
      { name: "ready", path: ["ready"], text: "ready" },
    ],
  );
});

test("ignores identifiers inside strings and AngularTS expression keywords", () => {
  const expression = `item in items track by item.id || "ignored.value"`;
  const identifiers = collectExpressionIdentifiers(expression);

  assert.deepEqual(
    identifiers.map((identifier) => identifier.path),
    [["item"], ["items"], ["item", "id"]],
  );
});

test("finds expression identifier at absolute offsets", () => {
  const expression = `{{ user.name | displayName }}`;
  const expressionStart = 100;
  const identifier = expressionIdentifierAt(
    expression,
    expressionStart + expression.indexOf("name"),
    expressionStart,
  );

  assert.deepEqual(identifier?.path, ["user", "name"]);
});
