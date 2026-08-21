import {
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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
mkdirSync(runtimePackage, { recursive: true });

const packageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
);

packageJson.main = "./build/index.js";
packageJson.module = "./build/index.js";
packageJson.browser = "./build/index.js";
packageJson.exports = mapRuntimeExports(packageJson.exports);
packageJson.exports["."] = {
  ...packageJson.exports["."],
  import: "./build/index.js",
  default: "./build/index.js",
};

writeFileSync(
  resolve(runtimePackage, "package.json"),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);

symlinkSync(
  resolve(repositoryRoot, ".build"),
  resolve(runtimePackage, "build"),
  process.platform === "win32" ? "junction" : "dir",
);
symlinkSync(
  resolve(repositoryRoot, "@types"),
  resolve(runtimePackage, "@types"),
  process.platform === "win32" ? "junction" : "dir",
);

console.log(`Linked Kotlin tests to AngularTS development build: ${repositoryRoot}`);

function mapRuntimeExports(exports) {
  return Object.fromEntries(
    Object.entries(exports).map(([name, definition]) => [
      name,
      mapExportDefinition(definition),
    ]),
  );
}

function mapExportDefinition(definition) {
  if (typeof definition === "string") {
    return definition.replace(/^\.\/dist\//, "./build/");
  }

  if (!definition || typeof definition !== "object") {
    return definition;
  }

  return Object.fromEntries(
    Object.entries(definition).map(([condition, target]) => [
      condition,
      mapExportDefinition(target),
    ]),
  );
}
