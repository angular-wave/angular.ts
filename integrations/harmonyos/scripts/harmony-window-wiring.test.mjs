import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("first-party abilities load ArkUI pages through the guarded core helper", () => {
  for (const path of [
    "entry/src/main/ets/entryability/EntryAbility.ets",
    "samples/kitchen-sink/entry/src/main/ets/entryability/KitchenSinkAbility.ets",
    "samples/pulse/entry/src/main/ets/entryability/PulseAbility.ets",
  ]) {
    const source = read(path);
    assert.match(source, /loadAngularNativePage\(windowStage, "pages\/Index"\)/u);
    assert.doesNotMatch(source, /windowStage\.loadContent/u);
  }

  const helper = read("packages/core/src/main/ets/web/AngularNativeWindow.ets");
  assert.match(helper, /try \{/u);
  assert.match(helper, /error\.code !== 0/u);
  assert.match(helper, /options\.onLoaded\?\.\(\)/u);
  assert.match(helper, /catch \{/u);

  const testAbility = read("entry/src/ohosTest/ets/testability/TestAbility.ets");
  assert.match(testAbility, /loadAngularNativePage\(/u);
  assert.doesNotMatch(testAbility, /windowStage\.loadContent/u);
});
