import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { elementWireNames } from "./native-elements-schema.mjs";

const root = new URL("../../../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("integrations/android/native-elements.json", root), "utf8"),
);
const outputs = await Promise.all([
  "integrations/android/navigation-fragments/src/main/java/io/github/angularwave/android/navigation/elements/NativeElementCatalog.kt",
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/NativeElements.kt",
  "src/runtime/native-elements.ts",
  "integrations/android/NATIVE_ELEMENTS.md",
].map((path) => readFile(new URL(path, root), "utf8")));
const implementation = await readFile(
  new URL(
    "integrations/android/navigation-fragments/src/main/java/io/github/angularwave/android/navigation/elements/AndroidNativeElements.kt",
    root,
  ),
  "utf8",
);

test("publishes every catalog wire name to every generated surface", () => {
  for (const element of catalog.elements) {
    for (const wireName of elementWireNames(element)) {
      for (const output of outputs) {
        assert.match(output, new RegExp(`(?:\\W|^)${escapeRegex(wireName)}(?:\\W|$)`));
      }
    }
  }
});

test("keeps catalog wire literals out of first-party factories", () => {
  for (const wireName of new Set(catalog.elements.flatMap(elementWireNames))) {
    assert.equal(
      implementation.includes(JSON.stringify(wireName)),
      false,
      `Replace ${wireName} with a NativeElementCatalog.Wire constant`,
    );
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
