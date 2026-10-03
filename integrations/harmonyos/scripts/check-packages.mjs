#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const artifacts = JSON.parse(await readFile(resolve(root, "harmony-artifacts.json"), "utf8"));
const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
const seen = new Set();
for (const artifact of artifacts) {
  const directory = resolve(root, "packages", artifact.module);
  const metadata = JSON.parse(await readFile(resolve(directory, "oh-package.json5"), "utf8"));
  if (metadata.name !== artifact.package) throw new Error(`${artifact.module} package name is stale`);
  if (metadata.version !== repository.version) throw new Error(`${artifact.module} version is stale`);
  if (metadata.license !== "MIT" || !metadata.description || !metadata.repository) {
    throw new Error(`${artifact.module} public metadata is incomplete`);
  }
  if (seen.has(metadata.name)) throw new Error(`Duplicate package name: ${metadata.name}`);
  seen.add(metadata.name);
  await access(resolve(directory, "src/main/module.json5"));
  await access(resolve(directory, "Index.ets"));
  await access(resolve(directory, "src/main/ets/Index.ets"));
  const readme = await readFile(resolve(directory, "README.md"), "utf8");
  const changelog = await readFile(resolve(directory, "CHANGELOG.md"), "utf8");
  await access(resolve(directory, "LICENSE"));
  if (!readme.includes(`ohpm install ${metadata.name}@${metadata.version}`)) {
    throw new Error(`${artifact.module} README lacks its exact install command`);
  }
  if (!changelog.includes(`## ${metadata.version}`)) {
    throw new Error(`${artifact.module} changelog lacks its current version`);
  }
  const dependencies = Object.keys(metadata.dependencies ?? {});
  if (artifact.module === "core" || artifact.module === "native-elements-compiler") {
    if (dependencies.length !== 0) throw new Error(`${artifact.module} must be dependency-free`);
  } else if (
    dependencies.length !== 1 ||
    dependencies[0] !== "@angular-wave/angular-native-harmony-core" ||
    metadata.dependencies[dependencies[0]] !== repository.version
  ) {
    throw new Error(`${artifact.module} must depend on the exact HarmonyOS core version`);
  }
}
console.log(`${artifacts.length} HarmonyOS packages have complete synchronized metadata.`);
