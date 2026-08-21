import test from "node:test";
import assert from "node:assert/strict";
import {
  builtInInjectables,
  createBuiltInInjectableCatalog,
} from "../catalog/injectables";

test("built-in injectable catalog is generated from injection-tokens source", () => {
  const names = new Set(builtInInjectables.map((entry) => entry.name));

  assert.ok(names.has("$scope"));
  assert.ok(names.has("$http"));
  assert.ok(names.has("$controller"));

  const controller = builtInInjectables.find(
    (entry) => entry.name === "$controller",
  );
  assert.equal(controller?.kind, "service");
  assert.equal(controller?.source?.file, "src/injection-tokens.ts");
});

test("injectable catalog returns empty list when no tokens are present", () => {
  assert.deepEqual(createBuiltInInjectableCatalog("export const nope = 1;"), []);
});
