#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const check = process.argv.includes("--check");
const artifacts = JSON.parse(
  await readFile(resolve(root, "harmony-artifacts.json"), "utf8"),
);
const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
const license = await readFile(resolve(root, "../../LICENSE"), "utf8");
const descriptions = {
  browser: [
    "Browser routes",
    "Open external HTTP and HTTPS locations through HarmonyOS while keeping packaged AngularTS routes in ArkWeb.",
    "HarmonyBrowserRoute",
  ],
  core: [
    "Core",
    "Host AngularTS in ArkWeb and render declared native elements on the ArkUI same-layer surface.",
    "AngularNativeDestination, AngularNativeWeb",
  ],
  credentials: [
    "Credentials",
    "Use HarmonyOS passkeys through the AngularTS Native credential capability.",
    "HarmonyCredentials, HarmonyPasskeys",
  ],
  maps: [
    "Maps",
    "Render the AngularTS Native map contract with Huawei Map Kit.",
    "harmonyMapControllerFactory",
  ],
  media: [
    "Media",
    "Play media through one destination-owned HarmonyOS AVPlayer.",
    "HarmonyMedia, HarmonyAVPlayer",
  ],
  "native-elements-compiler": [
    "Native element compiler",
    "Compile explicit custom native-element descriptors for the HarmonyOS renderer registry.",
    "compileNativeElement",
  ],
  navigation: [
    "Navigation",
    "Mirror AngularTS route operations into an ArkUI NavPathStack without moving route ownership out of AngularTS.",
    "HarmonyNavigation, HarmonyNavPathPlatform",
  ],
  paging: [
    "Paging",
    "Apply keyed insert, move, update, and remove operations to lazy native collections.",
    "KeyedNativeCollection",
  ],
};

const examples = {
  maps: `import { harmonyMapControllerFactory } from "@angular-wave/angular-native-harmony-maps";

new AngularNativeDestination({
  ...options,
  nativeControllerFactory: harmonyMapControllerFactory,
});`,
};

for (const artifact of artifacts) {
  const [title, summary, imports] = descriptions[artifact.module];
  const example = examples[artifact.module]
    ?? `import { ${imports} } from "${artifact.package}";`;
  const compatibility = artifact.module === "maps"
    ? "\nThis package requires Huawei Map Kit and the HarmonyOS API 26 SDK. It is not included in the public OpenHarmony API 23 compatibility build.\n"
    : "";
  const readme = `# AngularTS Native HarmonyOS ${title}\n\n${summary}\n\n## Install\n\n\`\`\`sh\nohpm install ${artifact.package}@${repository.version}\n\`\`\`\n\n## Use\n\n\`\`\`ts\n${example}\n\`\`\`\n${compatibility}\nThis package is part of [AngularTS](https://github.com/angular-wave/angular.ts). The [HarmonyOS integration guide](https://github.com/angular-wave/angular.ts/tree/master/integrations/harmonyos) covers project setup, security, compatibility, and release checks.\n`;
  const changelog = `# Changelog\n\n## ${repository.version}\n\n- Initial HarmonyOS NEXT package for AngularTS Native.\n\nSee the [AngularTS changelog](https://github.com/angular-wave/angular.ts/blob/master/CHANGELOG.md) for release details.\n`;
  const directory = resolve(root, "packages", artifact.module);
  for (const [name, content] of [
    ["README.md", readme],
    ["CHANGELOG.md", changelog],
    ["LICENSE", license],
  ]) {
    const path = resolve(directory, name);
    if (check) {
      let current = "";
      try {
        current = await readFile(path, "utf8");
      } catch {}
      if (current !== content) throw new Error(`${artifact.module}/${name} is stale`);
    } else {
      await writeFile(path, content);
    }
  }
}

console.log(`${artifacts.length} HarmonyOS package documentation sets are current.`);
