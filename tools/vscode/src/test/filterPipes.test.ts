import test from "node:test";
import assert from "node:assert/strict";
import { scanAngularTsFilterPipes } from "../templates/filters";

test("scans chained AngularTS filters with arguments", () => {
  const filters = scanAngularTsFilterPipes(
    `users | activeOnly:true | orderBy:"name":false`,
    10,
  );

  assert.deepEqual(
    filters.map((filter) => ({
      name: filter.name,
      start: filter.start,
    })),
    [
      { name: "activeOnly", start: 18 },
      { name: "orderBy", start: 36 },
    ],
  );
});

test("ignores logical-or and pipes inside strings or nested calls", () => {
  const filters = scanAngularTsFilterPipes(
    `label || "a | b" | uppercase:format(value | nested)`,
  );

  assert.deepEqual(
    filters.map((filter) => filter.name),
    ["uppercase"],
  );
});
