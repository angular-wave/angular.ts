import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultBuildEnvironment,
  projectBuildProfile,
  projectModuleManifest,
} from "./build-openharmony-hap.mjs";

const integration = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("project module names match their generated manifests", async () => {
  const profile = JSON.parse(await readFile(resolve(integration, "build-profile.json5"), "utf8"));
  for (const module of profile.modules.filter((value) => value.srcPath.startsWith("./packages/"))) {
    const manifest = JSON.parse(
      await readFile(resolve(integration, module.srcPath, "src/main/module.json5"), "utf8"),
    );
    assert.equal(module.name, manifest.module.name, module.srcPath);
  }
});

test("projects HarmonyOS products onto the public OpenHarmony API", () => {
  const source = {
    app: {
      products: [{
        compileSdkVersion: "26.0.0",
        compatibleSdkVersion: "20.0.0",
        targetSdkVersion: "26.0.0",
        runtimeOS: "HarmonyOS",
      }],
      modules: [],
    },
    modules: [
      { name: "core", srcPath: "./packages/core" },
      { name: "credentials", srcPath: "./packages/credentials" },
    ],
  };
  const projected = projectBuildProfile(source);
  assert.deepEqual(projected.app.products[0], {
    compileSdkVersion: 23,
    compatibleSdkVersion: 23,
    targetSdkVersion: 23,
    runtimeOS: "OpenHarmony",
  });
  assert.equal(source.app.products[0].compileSdkVersion, "26.0.0");
  assert.deepEqual(projected.modules, [{ name: "core", srcPath: "./packages/core" }]);
  assert.equal(source.modules.length, 2);
  assert.deepEqual(
    projectBuildProfile({ apiType: "stageMode" }),
    { apiType: "stageMode" },
  );
});

test("projects HarmonyOS device families onto the OpenHarmony default device", () => {
  const source = { module: { name: "entry", deviceTypes: ["phone", "tablet", "2in1"] } };
  const projected = projectModuleManifest(source);
  assert.deepEqual(projected.module.deviceTypes, ["default"]);
  assert.deepEqual(source.module.deviceTypes, ["phone", "tablet", "2in1"]);
});

test("uses overrideable versioned OpenHarmony build dependencies", () => {
  assert.deepEqual(
    defaultBuildEnvironment({
      HOME: "/home/test",
      OPENHARMONY_BUILD_HVIGOR_HOME: "/tools/hvigor",
      OPENHARMONY_BUILD_SDK_HOME: "/tools/sdk",
    }),
    { hvigorHome: "/tools/hvigor", sdkHome: "/tools/sdk" },
  );
  assert.deepEqual(
    defaultBuildEnvironment({ XDG_CACHE_HOME: "/cache" }),
    {
      hvigorHome: "/cache/angularts/hvigor-6.0.0.868/extracted-v1",
      sdkHome: "/cache/angularts/openharmony-sdk-hvigor-6.1.0.31",
    },
  );
});
