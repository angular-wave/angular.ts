import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { entryCopyFilter, validateInstalledArtifacts } from "./harmony-consumer.mjs";

const artifacts = [
  { module: "core", package: "core" },
  { module: "navigation", package: "navigation" },
];
const installed = [
  { name: "core", version: "1.2.3", dependencies: {} },
  { name: "navigation", version: "1.2.3", dependencies: {
    "@angular-wave/angular-native-harmony-core": "1.2.3",
  } },
];

test("accepts exact installed package and dependency versions", () => {
  assert.doesNotThrow(() => validateInstalledArtifacts(artifacts, "1.2.3", installed));
});

test("rejects missing and stale installed packages", () => {
  assert.throws(() => validateInstalledArtifacts(artifacts, "1.2.3", installed.slice(0, 1)));
  assert.throws(() =>
    validateInstalledArtifacts(artifacts, "1.2.4", installed),
  );
});

test("rejects local, unpinned, and unrelated dependencies", () => {
  for (const [name, version] of [
    ["@angular-wave/angular-native-harmony-core", "file:../core"],
    ["@angular-wave/angular-native-harmony-core", "^1.2.3"],
    ["unexpected", "1.2.3"],
  ]) {
    assert.throws(() =>
      validateInstalledArtifacts(artifacts, "1.2.3", [
        installed[0],
        { name: "navigation", version: "1.2.3", dependencies: { [name]: version } },
      ]),
    );
  }
});

test("copies source and resources without build, install, or lock state", () => {
  const entry = "/project/entry";
  assert.equal(entryCopyFilter(entry, entry), true);
  assert.equal(entryCopyFilter(entry, resolve(entry, "src/main/Index.ets")), true);
  assert.equal(entryCopyFilter(entry, resolve(entry, "build/output.hap")), false);
  assert.equal(entryCopyFilter(entry, resolve(entry, "oh_modules/core/Index.ets")), false);
  assert.equal(entryCopyFilter(entry, resolve(entry, "oh-package-lock.json5")), false);
});
