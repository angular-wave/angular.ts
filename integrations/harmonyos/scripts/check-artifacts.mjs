#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const artifacts = JSON.parse(
  await readFile(new URL("../harmony-artifacts.json", import.meta.url), "utf8"),
);
const expectedModules = new Set([
  "browser", "core", "credentials", "maps", "media",
  "native-elements-compiler", "navigation", "paging",
]);
const modules = new Set();
const packages = new Set();

for (const artifact of artifacts) {
  if (!expectedModules.has(artifact.module)) {
    throw new Error(`Unexpected HarmonyOS module: ${artifact.module}`);
  }
  if (modules.has(artifact.module)) throw new Error(`Duplicate module: ${artifact.module}`);
  if (packages.has(artifact.package)) throw new Error(`Duplicate package: ${artifact.package}`);
  if (!/^@angular-wave\/angular-native-harmony-[a-z-]+$/u.test(artifact.package)) {
    throw new Error(`Invalid OHPM package name: ${artifact.package}`);
  }
  if (artifact.extension !== "har") throw new Error(`${artifact.module} must publish a HAR`);
  if (!Number.isInteger(artifact.maximumBytes) || artifact.maximumBytes < 1) {
    throw new Error(`${artifact.module} must define a positive size budget`);
  }
  modules.add(artifact.module);
  packages.add(artifact.package);
}

for (const module of expectedModules) {
  if (!modules.has(module)) throw new Error(`Missing HarmonyOS module: ${module}`);
}

console.log(`${artifacts.length} HarmonyOS HAR artifacts have valid publication contracts.`);
