#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "../..");
const check = process.argv.includes("--check");
const artifacts = JSON.parse(await readFile(resolve(root, "harmony-artifacts.json"), "utf8"));
const repositoryPackage = JSON.parse(await readFile(resolve(repositoryRoot, "package.json"), "utf8"));
const version = repositoryPackage.version;
const versionCode = version.split(".").reduce(
  (value, part, index) => value + Number.parseInt(part, 10) * [10000, 100, 1][index],
  0,
);
const files = new Map();

files.set("oh-package.json5", json5({
  modelVersion: "6.0.0",
  name: "angular-native-harmony-workspace",
  version,
  description: "AngularTS Native packages for HarmonyOS NEXT",
  license: "MIT",
  dependencies: {},
  devDependencies: {},
  overrides: {
    "@angular-wave/angular-native-harmony-core": "file:./packages/core",
  },
}));
files.set("build-profile.json5", json5({
  app: {
    signingConfigs: [],
    products: [{
      name: "default",
      compileSdkVersion: "26.0.0",
      compatibleSdkVersion: "20.0.0",
      targetSdkVersion: "26.0.0",
      runtimeOS: "HarmonyOS",
    }],
    buildModeSet: [{ name: "debug" }, { name: "release" }],
  },
  modules: [
    ...artifacts.map(({ module }) => ({
      name: module.replaceAll("-", "_"),
      srcPath: `./packages/${module}`,
      targets: [{ name: "default", applyToProducts: ["default"] }],
    })),
    {
      name: "entry",
      srcPath: "./entry",
      targets: [{ name: "default", applyToProducts: ["default"] }],
    },
  ],
}));
files.set("hvigorfile.ts", projectHvigor());
files.set("hvigor/hvigor-config.json5", json5({
  modelVersion: "6.0.0",
  dependencies: {},
  execution: {
    analyze: "advanced",
    daemon: true,
    incremental: true,
    parallel: true,
    typeCheck: true,
  },
  logging: { level: "info" },
  debugging: { stacktrace: true },
  nodeOptions: { maxOldSpaceSize: 8192, exposeGC: true },
}));

for (const artifact of artifacts) {
  const module = artifact.module;
  const dependencies = module === "core" || module === "native-elements-compiler"
    ? {}
    : { "@angular-wave/angular-native-harmony-core": version };
  files.set(`packages/${module}/oh-package.json5`, json5({
    modelVersion: "6.0.0",
    name: artifact.package,
    version,
    description: description(module),
    main: "Index.ets",
    author: "Angular Wave",
    license: "MIT",
    repository: "https://github.com/angular-wave/angular.ts",
    keywords: ["AngularTS", "HarmonyOS", "ArkUI", "native"],
    dependencies,
  }));
  files.set(`packages/${module}/build-profile.json5`, json5({
    apiType: "stageMode",
    buildOptionSet: [{
      name: "release",
      arkOptions: {
        obfuscation: {
          ruleOptions: { enable: true, files: ["./obfuscation-rules.txt"] },
          consumerFiles: ["./consumer-rules.txt"],
        },
      },
    }],
    targets: [{ name: "default" }, { name: "ohosTest" }],
  }));
  files.set(`packages/${module}/hvigorfile.ts`, libraryHvigor());
  files.set(
    `packages/${module}/Index.ets`,
    module === "core"
      ? `export * from './src/main/ets/Index';
export { AngularNativeDestination } from './src/main/ets/web/AngularNativeDestination';
export { AngularNativeWeb } from './src/main/ets/web/AngularNativeWeb';
export { HarmonySystemCapabilities } from './src/main/ets/capabilities/HarmonySystemCapabilities';
`
      : "export * from './src/main/ets/Index';\n",
  );
  files.set(`packages/${module}/src/main/module.json5`, json5({
    module: {
      name: module.replaceAll("-", "_"),
      type: "har",
      deviceTypes: ["phone", "tablet", "2in1"],
    },
  }));
  files.set(`packages/${module}/obfuscation-rules.txt`, "-keep-global-name\n");
  files.set(`packages/${module}/consumer-rules.txt`, "-keep-global-name\n");
}

files.set("entry/oh-package.json5", json5({
  modelVersion: "6.0.0",
  name: "angular-native-harmony-proof",
  version,
  private: true,
  description: "AngularTS Native HarmonyOS proof and device test application",
  license: "MIT",
  dependencies: {
    "@angular-wave/angular-native-harmony-core": "file:../packages/core",
    "@angular-wave/angular-native-harmony-navigation": "file:../packages/navigation",
  },
}));
files.set("entry/build-profile.json5", json5({
  apiType: "stageMode",
  buildOption: {},
  buildOptionSet: [{
    name: "release",
    arkOptions: {
      obfuscation: {
        ruleOptions: { enable: true, files: ["./obfuscation-rules.txt"] },
      },
    },
  }],
  targets: [{ name: "default" }, { name: "ohosTest" }],
}));
files.set("entry/hvigorfile.ts", applicationHvigor());
files.set("entry/obfuscation-rules.txt", "-keep-global-name\n");

files.set("samples/pulse/oh-package.json5", json5({
  modelVersion: "6.0.0",
  name: "angular-native-harmony-pulse-workspace",
  version,
  private: true,
  license: "MIT",
  dependencies: {},
  devDependencies: {},
  overrides: {
    "@angular-wave/angular-native-harmony-core": "file:../../packages/core",
  },
}));
files.set("samples/pulse/build-profile.json5", json5({
  app: {
    signingConfigs: [],
    products: [{
      name: "default",
      compileSdkVersion: "26.0.0",
      compatibleSdkVersion: "20.0.0",
      targetSdkVersion: "26.0.0",
      runtimeOS: "HarmonyOS",
    }],
    buildModeSet: [{ name: "debug" }, { name: "release" }],
  },
  modules: [
    {
      name: "core",
      srcPath: "../../packages/core",
      targets: [{ name: "default", applyToProducts: ["default"] }],
    },
    {
      name: "navigation",
      srcPath: "../../packages/navigation",
      targets: [{ name: "default", applyToProducts: ["default"] }],
    },
    {
      name: "entry",
      srcPath: "./entry",
      targets: [{ name: "default", applyToProducts: ["default"] }],
    },
  ],
}));
files.set("samples/pulse/hvigorfile.ts", projectHvigor());
files.set("samples/pulse/hvigor/hvigor-config.json5", json5({
  modelVersion: "6.0.0",
  dependencies: {},
  execution: {
    analyze: "advanced",
    daemon: true,
    incremental: true,
    parallel: true,
    typeCheck: true,
  },
  logging: { level: "info" },
  debugging: { stacktrace: true },
  nodeOptions: { maxOldSpaceSize: 4096, exposeGC: true },
}));
files.set("samples/pulse/AppScope/app.json5", json5({
  app: {
    bundleName: "io.github.angularwave.harmony.pulse",
    vendor: "Angular Wave",
    versionCode,
    versionName: version,
    icon: "$media:app_icon",
    label: "$string:app_name",
  },
}));
files.set("samples/pulse/AppScope/resources/base/element/string.json", json5({
  string: [{ name: "app_name", value: "Pulse" }],
}));
files.set("samples/pulse/AppScope/resources/base/media/app_icon.json", json5({
  "layered-image": { background: "#F7F2E8", foreground: "#B83A24" },
}));
files.set("samples/pulse/entry/oh-package.json5", json5({
  modelVersion: "6.0.0",
  name: "angular-native-harmony-pulse",
  version,
  private: true,
  description: "Pulse sample for AngularTS Native on HarmonyOS",
  license: "MIT",
  dependencies: {
    "@angular-wave/angular-native-harmony-navigation": "file:../../../packages/navigation",
  },
}));
files.set("samples/pulse/entry/build-profile.json5", json5({
  apiType: "stageMode",
  buildOption: {},
  buildOptionSet: [{
    name: "release",
    arkOptions: {
      obfuscation: {
        ruleOptions: { enable: true, files: ["./obfuscation-rules.txt"] },
      },
    },
  }],
  targets: [{ name: "default" }, { name: "ohosTest" }],
}));
files.set("samples/pulse/entry/hvigorfile.ts", applicationHvigor());
files.set("samples/pulse/entry/obfuscation-rules.txt", "-keep-global-name\n");
function nativePermissions(ability) {
  const inUse = { abilities: [ability], when: "inuse" };
  const location = {
    reason: "$string:permission_location",
    usedScene: inUse,
  };
  return [
    { name: "ohos.permission.INTERNET" },
    { name: "ohos.permission.GET_NETWORK_INFO" },
    {
      name: "ohos.permission.READ_PASTEBOARD",
      reason: "$string:permission_pasteboard",
      usedScene: inUse,
    },
    { name: "ohos.permission.VIBRATE" },
    { name: "ohos.permission.ACCESS_BIOMETRIC" },
    { name: "ohos.permission.LOCATION", ...location },
    { name: "ohos.permission.APPROXIMATELY_LOCATION", ...location },
  ];
}
files.set("samples/pulse/entry/src/main/module.json5", json5({
  module: {
    name: "entry",
    type: "entry",
    description: "$string:module_desc",
    mainElement: "PulseAbility",
    deviceTypes: ["phone", "tablet", "2in1"],
    deliveryWithInstall: true,
    installationFree: false,
    pages: "$profile:main_pages",
    requestPermissions: nativePermissions("PulseAbility"),
    abilities: [{
      name: "PulseAbility",
      srcEntry: "./ets/entryability/PulseAbility.ets",
      description: "$string:PulseAbility_desc",
      label: "$string:PulseAbility_label",
      startWindowIcon: "$media:start_window_icon",
      startWindowBackground: "$color:start_window_background",
      exported: true,
      skills: [{
        entities: ["entity.system.home"],
        actions: ["action.system.home"],
      }],
    }],
  },
}));
files.set("samples/pulse/entry/src/main/resources/base/element/string.json", json5({
  string: [
    { name: "module_desc", value: "Pulse for AngularTS Native" },
    { name: "PulseAbility_desc", value: "Pulse for AngularTS Native" },
    { name: "PulseAbility_label", value: "Pulse" },
    { name: "permission_pasteboard", value: "Used when you paste content into Pulse." },
    { name: "permission_location", value: "Used to provide location-aware social features." },
  ],
}));
files.set("samples/pulse/entry/src/main/resources/base/element/color.json", json5({
  color: [{ name: "start_window_background", value: "#F7F2E8" }],
}));
files.set("samples/pulse/entry/src/main/resources/base/media/start_window_icon.json", json5({
  "layered-image": { background: "#F7F2E8", foreground: "#B83A24" },
}));
files.set("samples/pulse/entry/src/main/resources/base/profile/main_pages.json", json5({
  src: ["pages/Index"],
}));

files.set("samples/kitchen-sink/oh-package.json5", json5({
  modelVersion: "6.0.0",
  name: "angular-native-harmony-kitchen-sink-workspace",
  version,
  private: true,
  license: "MIT",
  dependencies: {},
  devDependencies: {},
}));
files.set("samples/kitchen-sink/build-profile.json5", json5({
  app: {
    signingConfigs: [],
    products: [{
      name: "default",
      compileSdkVersion: "26.0.0",
      compatibleSdkVersion: "20.0.0",
      targetSdkVersion: "26.0.0",
      runtimeOS: "HarmonyOS",
    }],
    buildModeSet: [{ name: "debug" }, { name: "release" }],
  },
  modules: [
    {
      name: "core",
      srcPath: "../../packages/core",
      targets: [{ name: "default", applyToProducts: ["default"] }],
    },
    {
      name: "entry",
      srcPath: "./entry",
      targets: [{ name: "default", applyToProducts: ["default"] }],
    },
  ],
}));
files.set("samples/kitchen-sink/hvigorfile.ts", projectHvigor());
files.set("samples/kitchen-sink/hvigor/hvigor-config.json5", json5({
  modelVersion: "6.0.0",
  dependencies: {},
  execution: {
    analyze: "advanced",
    daemon: true,
    incremental: true,
    parallel: true,
    typeCheck: true,
  },
  logging: { level: "info" },
  debugging: { stacktrace: true },
  nodeOptions: { maxOldSpaceSize: 4096, exposeGC: true },
}));
files.set("samples/kitchen-sink/AppScope/app.json5", json5({
  app: {
    bundleName: "io.github.angularwave.harmony.kitchensink",
    vendor: "Angular Wave",
    versionCode,
    versionName: version,
    icon: "$media:app_icon",
    label: "$string:app_name",
  },
}));
files.set("samples/kitchen-sink/AppScope/resources/base/element/string.json", json5({
  string: [{ name: "app_name", value: "Native Kitchen Sink" }],
}));
files.set("samples/kitchen-sink/AppScope/resources/base/media/app_icon.json", json5({
  "layered-image": { background: "#20201D", foreground: "#F7F2E8" },
}));
files.set("samples/kitchen-sink/entry/oh-package.json5", json5({
  modelVersion: "6.0.0",
  name: "angular-native-harmony-kitchen-sink",
  version,
  private: true,
  description: "Native component kitchen sink for AngularTS on HarmonyOS",
  license: "MIT",
  dependencies: {
    "@angular-wave/angular-native-harmony-core": "file:../../../packages/core",
  },
}));
files.set("samples/kitchen-sink/entry/build-profile.json5", json5({
  apiType: "stageMode",
  buildOption: {},
  buildOptionSet: [{
    name: "release",
    arkOptions: {
      obfuscation: {
        ruleOptions: { enable: true, files: ["./obfuscation-rules.txt"] },
      },
    },
  }],
  targets: [{ name: "default" }, { name: "ohosTest" }],
}));
files.set("samples/kitchen-sink/entry/hvigorfile.ts", applicationHvigor());
files.set("samples/kitchen-sink/entry/obfuscation-rules.txt", "-keep-global-name\n");
files.set("samples/kitchen-sink/entry/src/main/module.json5", json5({
  module: {
    name: "entry",
    type: "entry",
    description: "$string:module_desc",
    mainElement: "KitchenSinkAbility",
    deviceTypes: ["phone", "tablet", "2in1"],
    deliveryWithInstall: true,
    installationFree: false,
    pages: "$profile:main_pages",
    requestPermissions: nativePermissions("KitchenSinkAbility"),
    abilities: [{
      name: "KitchenSinkAbility",
      srcEntry: "./ets/entryability/KitchenSinkAbility.ets",
      description: "$string:KitchenSinkAbility_desc",
      label: "$string:KitchenSinkAbility_label",
      startWindowIcon: "$media:start_window_icon",
      startWindowBackground: "$color:start_window_background",
      exported: true,
      skills: [{
        entities: ["entity.system.home"],
        actions: ["action.system.home"],
      }],
    }],
  },
}));
files.set("samples/kitchen-sink/entry/src/main/resources/base/element/string.json", json5({
  string: [
    { name: "module_desc", value: "AngularTS Native kitchen sink" },
    { name: "KitchenSinkAbility_desc", value: "AngularTS Native kitchen sink" },
    { name: "KitchenSinkAbility_label", value: "Native Kitchen Sink" },
    { name: "permission_pasteboard", value: "Used by the clipboard component examples." },
    { name: "permission_location", value: "Used to demonstrate location-aware native features." },
  ],
}));
files.set("samples/kitchen-sink/entry/src/main/resources/base/element/color.json", json5({
  color: [{ name: "start_window_background", value: "#20201D" }],
}));
files.set("samples/kitchen-sink/entry/src/main/resources/base/media/start_window_icon.json", json5({
  "layered-image": { background: "#20201D", foreground: "#F7F2E8" },
}));
files.set("samples/kitchen-sink/entry/src/main/resources/base/profile/main_pages.json", json5({
  src: ["pages/Index"],
}));

let stale = false;
for (const [relative, content] of files) {
  const path = resolve(root, relative);
  if (check) {
    let current = "";
    try {
      current = await readFile(path, "utf8");
    } catch {}
    if (current !== content) {
      console.error(`${relative} is out of date. Run make -C integrations/harmonyos generate.`);
      stale = true;
    }
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
}
if (stale) process.exitCode = 1;

function json5(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function projectHvigor() {
  return "import { appTasks } from '@ohos/hvigor-ohos-plugin';\n\nexport default { system: appTasks, plugins: [] };\n";
}

function libraryHvigor() {
  return "import { harTasks } from '@ohos/hvigor-ohos-plugin';\n\nexport default { system: harTasks, plugins: [] };\n";
}

function applicationHvigor() {
  return "import { hapTasks } from '@ohos/hvigor-ohos-plugin';\n\nexport default { system: hapTasks, plugins: [] };\n";
}

function description(module) {
  const names = {
    core: "ArkWeb bridge, ArkUI native elements, and core capabilities for AngularTS Native",
    navigation: "ArkUI navigation and route synchronization for AngularTS Native",
    browser: "Browser presentation for AngularTS Native",
    credentials: "Password and passkey support for AngularTS Native",
    maps: "Map Kit native element support for AngularTS Native",
    media: "Media Kit playback for AngularTS Native",
    paging: "Lazy native collections for AngularTS Native",
    "native-elements-compiler": "Native element descriptor compiler for AngularTS Native",
  };
  return names[module];
}
