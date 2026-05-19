import test from "node:test";
import assert from "node:assert/strict";
import { builtInFilters, createBuiltInFilterCatalog } from "../catalog/filters";

test("built-in filter catalog is generated from ngBuiltInFilters", () => {
  const names = builtInFilters.map((entry) => entry.name);

  assert.ok(names.includes("currency"));
  assert.ok(names.includes("date"));
  assert.ok(names.includes("filter"));
  assert.ok(names.includes("json"));
  assert.ok(names.includes("orderBy"));
  assert.ok(names.includes("relativeTime"));

  const currency = builtInFilters.find((entry) => entry.name === "currency");
  assert.equal(currency?.kind, "filter");
  assert.equal(currency?.source?.file, "src/ng.ts");
  assert.match(currency?.description ?? "", /Built-in filters/);
});

test("filter catalog returns empty list when source shape is absent", () => {
  assert.deepEqual(createBuiltInFilterCatalog("export const nope = {};"), []);
});
