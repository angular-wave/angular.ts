import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("documents and ships UIAbility navigation recovery wiring", () => {
  const guide = read("../../../docs/content/docs/integrations/harmonyos.md");
  const pulse = read("../samples/pulse/entry/src/main/ets/entryability/PulseAbility.ets");
  const component = read("../packages/navigation/src/main/ets/AngularNativeNavigation.ets");
  const exports = read("../packages/navigation/src/main/ets/Index.ets");

  assert.match(guide, /extends AngularNativeNavigationAbility/u);
  assert.match(guide, /recoveryKey: 'dashboard'/u);
  assert.match(pulse, /extends AngularNativeNavigationAbility/u);
  assert.match(pulse, /super\.onCreate\(want, launchParam\)/u);
  assert.match(component, /@Prop recoveryKey: string = "default"/u);
  assert.match(exports, /export \{ AngularNativeNavigationAbility \}/u);
});
