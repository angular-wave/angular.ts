import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("native-capabilities.json", root), "utf8"));
const androidGenerated = await readFile(new URL("navigation-fragments/src/main/java/io/github/angularwave/android/navigation/bridge/NativeCapabilityCatalog.kt", root), "utf8");
const androidRuntime = await readFile(new URL("navigation-fragments/src/main/java/io/github/angularwave/android/navigation/bridge/AndroidNativeCapabilities.kt", root), "utf8");
const kotlin = await readFile(new URL("../kotlin/src/jsMain/kotlin/angular/ts/NativeCapabilities.kt", root), "utf8");
const typescript = await readFile(new URL("../../src/runtime/native-capabilities.ts", root), "utf8");
const documentation = await readFile(new URL("NATIVE_CAPABILITIES.md", root), "utf8");
const rust = await readFile(new URL("../wasm/rust/crates/angular-ts/src/native_capabilities.rs", root), "utf8");
const go = await readFile(new URL("../wasm/go/native_capabilities.go", root), "utf8");

test("publishes every capability wire name to every generated surface", () => {
  for (const capability of catalog.capabilities) {
    for (const output of [androidGenerated, kotlin, typescript, rust, go, documentation]) {
      assert.ok(output.includes(`\"${capability.name}\"`) || output.includes(`\`${capability.name}\``), capability.name);
      assert.ok(output.includes(capability.threading), `${capability.name} threading`);
      assert.ok(output.includes(capability.lifecycle), `${capability.name} lifecycle`);
      assert.ok(output.includes(capability.errorProtocol), `${capability.name} error protocol`);
      capability.methods.forEach(({ name }) => assert.ok(output.includes(name), `${capability.name}.${name}`));
      capability.events.forEach(({ name }) => assert.ok(output.includes(name), `${capability.name}.${name}`));
    }
  }
});

test("uses generated operations as the only built-in Android operation table", () => {
  assert.match(androidRuntime, /NativeCapabilityCatalog\.builtIns/);
  assert.doesNotMatch(androidRuntime, /val operations\s*=/);
  for (const capability of catalog.capabilities.filter(({ artifact }) => artifact === "navigation")) {
    assert.ok(androidRuntime.includes(`\"${capability.name}\"`), capability.name);
  }
});
