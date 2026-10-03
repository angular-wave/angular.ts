import assert from "node:assert/strict";
import test from "node:test";
import { validateNativeElementCatalog } from "./native-elements-schema.mjs";

const element = {
  name: "button",
  aliases: [],
  category: "action",
  artifact: "navigation",
  maturity: "stable",
  minSdk: 28,
  stateOwnership: "none",
  accessibility: { role: "button", labelProperty: "text", required: true },
  properties: [{ name: "text", type: "STRING" }],
  methods: [],
  events: [{ name: "click" }],
};

test("accepts a complete native element catalog", () => {
  assert.doesNotThrow(() =>
    validateNativeElementCatalog({ schemaVersion: 3, elements: [element] }),
  );
});

test("rejects stale schemas, duplicate names, and incomplete metadata", () => {
  assert.throws(() => validateNativeElementCatalog({ schemaVersion: 1, elements: [element] }));
  assert.throws(() =>
    validateNativeElementCatalog({ schemaVersion: 1, elements: [element, element] }),
  );
  assert.throws(() =>
    validateNativeElementCatalog({
      schemaVersion: 1,
      elements: [{ ...element, accessibility: undefined }],
    }),
  );
});

test("rejects invalid properties and duplicate members", () => {
  assert.throws(() =>
    validateNativeElementCatalog({
      schemaVersion: 1,
      elements: [{ ...element, properties: [{ name: "text", type: "UNKNOWN" }] }],
    }),
  );
  assert.throws(() =>
    validateNativeElementCatalog({
      schemaVersion: 1,
      elements: [{ ...element, events: [{ name: "click" }, { name: "click" }] }],
    }),
  );
});

test("accepts every supported property and operation type", () => {
  const types = ["BOOLEAN", "COLOR", "FLOAT", "INTEGER", "JSON", "STRING", "STRING_LIST"];
  assert.doesNotThrow(() =>
    validateNativeElementCatalog({
      schemaVersion: 3,
      elements: [{
        ...element,
        properties: types.map((type, index) => ({ name: `property${index}`, type })),
        accessibility: { role: "button", labelProperty: "property0", required: true },
        methods: types.map((type, index) => ({ name: `method${index}`, parameters: type, result: type })),
        events: types.map((type, index) => ({ name: `event${index}`, payload: type })),
      }],
    }),
  );
});

test("rejects duplicate aliases, methods, invalid operations, state, and labels", () => {
  const invalidElements = [
    { ...element, aliases: ["button"] },
    { ...element, methods: [{ name: "open" }, { name: "open" }] },
    { ...element, methods: [{ name: "open", result: "UNKNOWN" }] },
    { ...element, events: [{ name: "change", payload: "UNKNOWN" }] },
    { ...element, stateOwnership: "scope" },
    { ...element, name: "menu", stateOwnership: "destination" },
    { ...element, artifact: "Maps SDK" },
    { ...element, aliases: undefined },
    { ...element, properties: [{ name: "text", type: "STRING", default: false }] },
    { ...element, properties: [{ name: "text", type: "STRING", required: "yes" }] },
    { ...element, accessibility: { role: "button", labelProperty: "missing", required: true } },
  ];
  for (const invalid of invalidElements) {
    assert.throws(() =>
      validateNativeElementCatalog({ schemaVersion: 3, elements: [invalid] }),
    );
  }
});
