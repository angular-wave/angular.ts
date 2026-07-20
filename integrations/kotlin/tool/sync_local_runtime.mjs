import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(integrationRoot, "../..");
const runtimePackage = resolve(
  integrationRoot,
  "build/js/node_modules/@angular-wave/angular.ts",
);

mkdirSync(dirname(runtimePackage), { recursive: true });
rmSync(runtimePackage, { force: true, recursive: true });
symlinkSync(
  repositoryRoot,
  runtimePackage,
  process.platform === "win32" ? "junction" : "dir",
);

console.log(`Linked Kotlin tests to AngularTS workspace: ${repositoryRoot}`);
