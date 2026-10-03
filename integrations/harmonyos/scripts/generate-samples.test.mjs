import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderElement, renderKitchenSink } from "./generate-samples.mjs";

const nativeRoot = new URL("../../native/", import.meta.url);
const elements = JSON.parse(
  await readFile(new URL("native-elements.json", nativeRoot), "utf8"),
).elements;
const capabilities = JSON.parse(
  await readFile(new URL("native-capabilities.json", nativeRoot), "utf8"),
).capabilities;

test("kitchen sink covers every native element contract", () => {
  const html = renderKitchenSink(elements, capabilities);
  for (const element of elements) {
    const component = renderElement(element);
    assert.match(html, new RegExp(`data-element="${element.name}"`, "u"));
    assert.match(component, new RegExp(`<ng-native-${element.name}\\b`, "u"));
    for (const property of element.properties) {
      assert.match(component, new RegExp(`data-property="${property.name}"`, "u"));
    }
    for (const event of element.events) {
      assert.match(component, new RegExp(`data-event="${event.name}"`, "u"));
    }
    for (const method of element.methods) {
      assert.match(component, new RegExp(`data-method="${method.name}"`, "u"));
    }
  }
});

test("kitchen sink covers every native capability contract", () => {
  const html = renderKitchenSink(elements, capabilities);
  for (const capability of capabilities) {
    assert.match(html, new RegExp(`data-capability="${capability.name}"`, "u"));
    for (const method of capability.methods) {
      assert.match(html, new RegExp(`data-capability="${capability.name}"[\\s\\S]*?data-method="${method.name}"`, "u"));
    }
    for (const event of capability.events) {
      assert.match(html, new RegExp(`data-capability="${capability.name}"[\\s\\S]*?data-event="${event.name}"`, "u"));
    }
  }
});

test("kitchen sink uses AngularTS auto-bootstrap", () => {
  const html = renderKitchenSink(elements, capabilities);
  assert.match(html, /<body ng-app="harmonyKitchenSink"/u);
  assert.doesNotMatch(html, /angular\.bootstrap/u);
  assert.match(html, /\.\/dist\/angular-ts\.esm\.js/u);
  assert.match(html, /\.\/dist\/runtime\/native\.js/u);
});
