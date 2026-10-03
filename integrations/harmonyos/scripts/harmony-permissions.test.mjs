import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const applications = [
  ["entry/src/main", "EntryAbility"],
  ["samples/kitchen-sink/entry/src/main", "KitchenSinkAbility"],
  ["samples/pulse/entry/src/main", "PulseAbility"],
];
const requiredPermissions = new Set([
  "ohos.permission.ACCESS_BIOMETRIC",
  "ohos.permission.APPROXIMATELY_LOCATION",
  "ohos.permission.GET_NETWORK_INFO",
  "ohos.permission.INTERNET",
  "ohos.permission.LOCATION",
  "ohos.permission.READ_PASTEBOARD",
  "ohos.permission.VIBRATE",
]);

for (const [root, ability] of applications) {
  test(`${root} declares every native capability permission`, async () => {
    const manifest = JSON.parse(await readFile(`${root}/module.json5`, "utf8"));
    const strings = JSON.parse(await readFile(`${root}/resources/base/element/string.json`, "utf8"));
    const permissions = manifest.module.requestPermissions;
    assert.deepEqual(new Set(permissions.map(({ name }) => name)), requiredPermissions);

    const reason = strings.string.find(({ name }) => name === "permission_location");
    assert.ok(reason?.value.length > 0);
    for (const name of ["ohos.permission.LOCATION", "ohos.permission.APPROXIMATELY_LOCATION"]) {
      const permission = permissions.find((candidate) => candidate.name === name);
      assert.equal(permission.reason, "$string:permission_location");
      assert.deepEqual(permission.usedScene, { abilities: [ability], when: "inuse" });
    }
  });
}
